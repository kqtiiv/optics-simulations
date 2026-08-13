"use client";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import CoordinateGrid from "@/components/coordinate-grid";
import React, { useState, useRef } from "react";
import { useTheme } from "@/components/theme-provider";
import { NavbarLogo } from "@/components/ui/resizable-navbar";
import { GlowingEffect } from "@/components/ui/glowing-effect";

interface ThinLensSimulationProps {
  focalLength?: number;
}

const ThinLensSimulation: React.FC<ThinLensSimulationProps> = () => {
  const { setTheme } = useTheme();
  setTheme("dark");

  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [objPos, setObjPos] = useState({ x: 1.5, y: 0.5 });
  const [focalLength, setFocalLength] = useState(5);

  const [showEquations, setShowEquations] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [isDraggingPopup, setIsDraggingPopup] = useState(false);
  const [popupPos, setPopupPos] = useState({ x: 100, y: 100 });
  const popupDragOffset = useRef({ x: 0, y: 0 });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const screenToWorld = (
    px: number,
    py: number,
    vp: { cx: number; cy: number; scale: number },
    canvas: HTMLCanvasElement
  ) => {
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    return {
      x: (px - cw / 2) / vp.scale + vp.cx,
      y: (ch / 2 - py) / vp.scale + vp.cy,
    };
  };

  const calculateImagePosition = (objX: number, objY: number) => {
    // Convex lens behavior:
    // - Object outside focal length (x > f): Real, inverted image
    // - Object inside focal length (x < f): Virtual, upright, enlarged image
    if (objX >= focalLength) {
      const imageX = (-focalLength / (objX - focalLength)) * objX;
      const imageY = (objY / objX) * imageX;
      return { x: imageX, y: imageY, type: "real" as const };
    } else {
      const imageX = (focalLength / (focalLength - objX)) * objX;
      const imageY = (objY / objX) * imageX;
      return { x: imageX, y: imageY, type: "virtual" as const };
    }
  };

  // Create convex lens shape based on PhET-style lens design
  const createLensShape = (
    ctx: CanvasRenderingContext2D,
    screen: (x: number, y: number) => { x: number; y: number }
  ) => {
    const lensHeight = 10.0;
    const halfHeight = lensHeight / 2;
    const lensWidth = 0.3;
    const halfWidth = lensWidth / 2;

    ctx.beginPath();
    ctx.moveTo(screen(0, halfHeight).x, screen(-halfWidth, halfHeight).y);

    // Left surface curve
    ctx.quadraticCurveTo(
      screen(-halfWidth - 0.2, 0).x,
      screen(-halfWidth - 0.2, 0).y,
      screen(0, -halfHeight).x,
      screen(-halfWidth, -halfHeight).y
    );

    // Right surface curve
    ctx.quadraticCurveTo(
      screen(halfWidth + 0.2, 0).x,
      screen(halfWidth + 0.2, 0).y,
      screen(0, halfHeight).x,
      screen(halfWidth, halfHeight).y
    );

    ctx.closePath();
  };

  const handlePopupMouseDown = (e: React.MouseEvent) => {
    setIsDraggingPopup(true);
    popupDragOffset.current = {
      x: e.clientX - popupPos.x,
      y: e.clientY - popupPos.y,
    };
  };

  const handlePopupMouseMove = (e: MouseEvent) => {
    if (!isDraggingPopup) return;
    setPopupPos({
      x: e.clientX - popupDragOffset.current.x,
      y: e.clientY - popupDragOffset.current.y,
    });
  };

  const handlePopupMouseUp = () => {
    setIsDraggingPopup(false);
  };

  React.useEffect(() => {
    if (isDraggingPopup) {
      document.addEventListener("mousemove", handlePopupMouseMove);
      document.addEventListener("mouseup", handlePopupMouseUp);
      return () => {
        document.removeEventListener("mousemove", handlePopupMouseMove);
        document.removeEventListener("mouseup", handlePopupMouseUp);
      };
    }
  }, [isDraggingPopup]);

  return (
    <div>
      <NavigationMenu viewport={false} className="z-10 p-1 m-auto bg-black">
        <NavigationMenuList>
          <NavigationMenuItem>
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </NavigationMenuItem>

          <NavigationMenuItem>
            <label className="text-white mr-2">Focal Length:</label>
            <input
              type="range"
              min="5"
              max="10"
              step="0.5"
              value={focalLength}
              onChange={(e) => setFocalLength(parseFloat(e.target.value))}
              className="w-20"
            />
            <span className="text-white ml-2">{focalLength}</span>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <button
              onClick={() => setShowEquations(!showEquations)}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {showEquations ? "Hide" : "Show"} Equations
            </button>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavbarLogo />
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>

      <CoordinateGrid
        initialViewport={{ cx: 0, cy: 0, scale: 100 }}
        disablePan={true}
        onMouseDown={(
          e: React.MouseEvent,
          vp: { cx: number; cy: number; scale: number },
          canvas: HTMLCanvasElement
        ) => {
          if (!imageSrc) return;
          const mouseWorld = screenToWorld(e.clientX, e.clientY, vp, canvas);

          const imgW = 0.5;
          const imgH = 0.5;

          if (
            mouseWorld.x >= objPos.x - imgW / 2 &&
            mouseWorld.x <= objPos.x + imgW / 2 &&
            mouseWorld.y >= objPos.y - imgH / 2 &&
            mouseWorld.y <= objPos.y + imgH / 2
          ) {
            setIsDragging(true);
            dragOffset.current = {
              x: mouseWorld.x - objPos.x,
              y: mouseWorld.y - objPos.y,
            };
          }
        }}
        onMouseMove={(
          e: React.MouseEvent,
          vp: { cx: number; cy: number; scale: number },
          canvas: HTMLCanvasElement
        ) => {
          if (!isDragging) return;
          const mouseWorld = screenToWorld(e.clientX, e.clientY, vp, canvas);

          let newX = mouseWorld.x - dragOffset.current.x;
          newX = Math.max(0.1, newX); // keep the object off the lens

          setObjPos({
            x: newX,
            y: mouseWorld.y - dragOffset.current.y,
          });
        }}
        onMouseUp={() => {
          setIsDragging(false);
        }}
        renderOverlay={(ctx, vp) => {
          const canvas = ctx.canvas;
          const screen = (x: number, y: number) => {
            const cw = canvas.clientWidth,
              ch = canvas.clientHeight;
            return {
              x: cw / 2 + (x - vp.cx) * vp.scale,
              y: ch / 2 - (y - vp.cy) * vp.scale,
            };
          };

          const lensHeight = 10;
          const halfHeight = lensHeight / 2;

          ctx.strokeStyle = "#00aaff";
          ctx.fillStyle = "rgba(0, 170, 255, 0.2)";
          ctx.lineWidth = 2;

          createLensShape(ctx, screen);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = "#00aaff";
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(screen(0, -halfHeight).x, screen(0, -halfHeight).y);
          ctx.lineTo(screen(0, halfHeight).x, screen(0, halfHeight).y);
          ctx.stroke();
          ctx.setLineDash([]);

          const f1 = screen(-focalLength, 0);
          const f2 = screen(focalLength, 0);

          ctx.fillStyle = "#00aaff";
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1;

          ctx.beginPath();
          ctx.arc(f1.x, f1.y, 5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(f2.x, f2.y, 5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.font = "12px Arial";
          ctx.textAlign = "center";
          ctx.fillText("F", f1.x, f1.y - 10);
          ctx.fillText("F", f2.x, f2.y - 10);

          if (imageSrc) {
            if (!imgRef.current) {
              imgRef.current = new Image();
              imgRef.current.src = imageSrc;
            }
            const img = imgRef.current;
            const imgW = 1;
            const imgH = 1;

            const topLeft = screen(objPos.x - imgW / 2, objPos.y + imgH / 2);
            const topRight = screen(objPos.x + imgW / 2, objPos.y + imgH / 2);
            const bottomLeft = screen(objPos.x - imgW / 2, objPos.y - imgH / 2);

            ctx.drawImage(
              img,
              topLeft.x,
              topLeft.y,
              topRight.x - topLeft.x,
              bottomLeft.y - topLeft.y
            );

            // remap the source image pixel-by-pixel through the lens equations
            const imagePos = calculateImagePosition(objPos.x, objPos.y);
            if (imagePos) {
              ctx.save();

              const pixelResolution = 200;

              for (let y = 0; y < pixelResolution; y++) {
                for (let x = 0; x < pixelResolution; x++) {
                  const worldX =
                    objPos.x - imgW / 2 + (imgW * x) / pixelResolution;
                  const worldY =
                    objPos.y - imgH / 2 + (imgH * y) / pixelResolution;

                  const warpedPos = calculateImagePosition(worldX, worldY);

                  if (warpedPos) {
                    const srcX = (x / pixelResolution) * img.width;
                    const srcY = (y / pixelResolution) * img.height;

                    const pixelSize = 4;

                    const warpedScreen = screen(warpedPos.x, warpedPos.y);

                    ctx.drawImage(
                      img,
                      srcX,
                      srcY,
                      pixelSize,
                      pixelSize,
                      warpedScreen.x - pixelSize / 2,
                      warpedScreen.y - pixelSize / 2,
                      pixelSize,
                      pixelSize
                    );
                  }
                }
              }

              ctx.restore();
            }

            if (imagePos) {
              ctx.strokeStyle = "#ff4444";
              ctx.lineWidth = 3;
              ctx.setLineDash([8, 4]);

              // Ray 1: Parallel to axis, through lens, then through focus to image
              const ray1Start = screen(objPos.x, objPos.y);
              const ray1Lens = screen(0, objPos.y);
              const ray1End = screen(imagePos.x, imagePos.y);
              ctx.beginPath();
              ctx.moveTo(ray1Start.x, ray1Start.y);
              ctx.lineTo(ray1Lens.x, ray1Lens.y);
              ctx.lineTo(ray1End.x, ray1End.y);
              ctx.stroke();

              // Ray 2: Through center of lens
              const ray2Start = screen(objPos.x, objPos.y);
              const ray2End = screen(imagePos.x, imagePos.y);
              ctx.beginPath();
              ctx.moveTo(ray2Start.x, ray2Start.y);
              ctx.lineTo(ray2End.x, ray2End.y);
              ctx.stroke();

              const ray3Start = screen(objPos.x, objPos.y);
              const ray3Lens = screen(0, objPos.y);
              const ray3End = screen(imagePos.x, imagePos.y);
              ctx.beginPath();
              ctx.moveTo(ray3Start.x, ray3Start.y);
              ctx.lineTo(ray3Lens.x, ray3Lens.y);
              ctx.lineTo(ray3End.x, ray3End.y);
              ctx.stroke();

              // for virtual images, extend rays to show virtual image location
              if (imagePos.type === "virtual") {
                const leftFocalPoint = screen(-focalLength, 0);
                const origin = screen(0, 0);
                ctx.strokeStyle = "#ff8888";
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(ray3Lens.x, ray3Lens.y);
                ctx.lineTo(leftFocalPoint.x, leftFocalPoint.y);
                ctx.moveTo(ray1Start.x, ray1Start.y);
                ctx.lineTo(origin.x, origin.y);
                ctx.stroke();

                ctx.strokeStyle = "#ff4444";
                ctx.setLineDash([8, 4]);
              }

              ctx.setLineDash([]);
              ctx.lineWidth = 1;
            }
          }

          ctx.fillStyle = "#ffffff";
          ctx.font = "14px Arial";
          ctx.textAlign = "center";

          const objLabel = screen(objPos.x, objPos.y + 0.8);
          ctx.fillText("(x, y)", objLabel.x, objLabel.y);

          if (imageSrc) {
            const imagePos = calculateImagePosition(objPos.x, objPos.y);
            if (imagePos) {
              const imgLabel = screen(imagePos.x, imagePos.y - 0.8);
              const imageType =
                imagePos.type === "virtual" ? "Virtual" : "Real";
              ctx.fillText(
                `(${imagePos.x.toFixed(2)}, ${imagePos.y.toFixed(2)})`,
                imgLabel.x,
                imgLabel.y
              );
              ctx.fillText(imageType, imgLabel.x, imgLabel.y - 20);
            }
          }
        }}
      />

      {showEquations && (
        <div
          className="fixed max-w-sm z-[999999] cursor-move"
          style={{
            left: `${popupPos.x}px`,
            top: `${popupPos.y}px`,
          }}
        >
          <div className="relative rounded-2xl border p-2 md:rounded-3xl md:p-3">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
            />
            <div className="border-0.75 relative flex flex-col justify-between gap-6 overflow-hidden rounded-xl p-6 md:p-6 dark:shadow-[0px_0px_27px_0px_#2D2D2D] bg-white dark:bg-black">
              <div className="relative flex flex-1 flex-col justify-between gap-3">
                <div
                  className="flex justify-between items-center cursor-move select-none"
                  onMouseDown={handlePopupMouseDown}
                >
                  <h3 className="-tracking-4 pt-0.5 font-sans text-xl/[1.375rem] font-semibold text-balance text-black md:text-2xl/[1.875rem] dark:text-white">
                    Thin Lens Equations
                  </h3>
                  <button
                    onClick={() => setShowEquations(false)}
                    className="text-gray-400 hover:text-white text-xl"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg border border-gray-600 p-3 bg-gray-50 dark:bg-gray-900">
                    <div className="font-bold text-black dark:text-white">
                      Thin Lens Equation:
                    </div>
                    <div className="text-center text-lg text-black dark:text-white">
                      1/u + 1/v = 1/f
                    </div>
                    <div className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                      where u = x, v = -X
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-600 p-3 bg-gray-50 dark:bg-gray-900">
                    <div className="font-bold text-black dark:text-white">
                      Real Image (x &gt; f):
                    </div>
                    <div className="text-center text-black dark:text-white">
                      X = -f / (x - f) × x
                    </div>
                    <div className="text-center text-black dark:text-white">
                      Y = y / x × X
                    </div>
                    <div className="text-xs mt-1 text-yellow-600 dark:text-yellow-400">
                      only if x &gt; f
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-600 p-3 bg-gray-50 dark:bg-gray-900">
                    <div className="font-bold text-black dark:text-white">
                      Virtual Image (0 &lt; x &lt; f):
                    </div>
                    <div className="text-center text-black dark:text-white">
                      X = f / (f - x) × x
                    </div>
                    <div className="text-center text-black dark:text-white">
                      Y = y / x × X
                    </div>
                    <div className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                      only if 0 &lt; x &lt; f
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <div>
                      • Object outside focal length (x &gt; f): Real, inverted
                      image
                    </div>
                    <div>
                      • Object inside focal length (x &lt; f): Virtual, upright,
                      enlarged image
                    </div>

                    <div>• Virtual images appear on same side as object</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function ImageFromThinLens() {
  return <ThinLensSimulation />;
}
