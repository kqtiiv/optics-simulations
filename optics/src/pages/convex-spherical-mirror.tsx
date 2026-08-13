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

interface ConvexMirrorSimulationProps {
  radiusOfCurvature?: number;
}

const ConvexMirrorSimulation: React.FC<ConvexMirrorSimulationProps> = () => {
  const { setTheme } = useTheme();
  setTheme("dark");

  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [objPos, setObjPos] = useState({ x: 5, y: 0 });
  const [radiusOfCurvature, setRadiusOfCurvature] = useState(0.5);

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
    const R = radiusOfCurvature;

    if (Math.abs(objY) > R) return null;
    const alpha = 0.5 * Math.atan2(objY, objX);
    const k = objX / Math.cos(2 * alpha);

    const numerator = k * Math.sin(alpha);
    const denominator =
      k / R - Math.cos(alpha) + (objX / objY) * Math.sin(alpha);

    if (Math.abs(denominator) < 1e-10) return null;

    const Y = numerator / denominator;
    const X = (objX * Y) / objY;

    // convex mirrors only ever form virtual images (behind the mirror)
    return { x: X, y: Y, type: "virtual" };
  };

  // semicircle of the given radius, curving outward toward +x
  const createMirrorShape = (
    ctx: CanvasRenderingContext2D,
    screen: (x: number, y: number) => { x: number; y: number },
    vp: { cx: number; cy: number; scale: number }
  ) => {
    ctx.beginPath();
    ctx.arc(
      screen(0, 0).x,
      screen(0, 0).y,
      radiusOfCurvature * vp.scale,
      -Math.PI / 2,
      Math.PI / 2
    );
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
            <label className="text-white mr-2">Radius of Curvature:</label>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={radiusOfCurvature}
              onChange={(e) => setRadiusOfCurvature(parseFloat(e.target.value))}
              className="w-20"
            />
            <span className="text-white ml-2">{radiusOfCurvature}</span>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <button
              onClick={() => setShowEquations(!showEquations)}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {showEquations ? "Hide" : "Show"} Information
            </button>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavbarLogo />
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>

      <CoordinateGrid
        initialViewport={{ cx: 0, cy: 0, scale: 200 }}
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
          newX = Math.max(0.1, newX); // keep the object off the mirror surface

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

          ctx.strokeStyle = "#0066cc";
          ctx.fillStyle = "rgba(0, 102, 204, 0.2)";
          ctx.lineWidth = 2;

          createMirrorShape(ctx, screen, vp);
          ctx.stroke();

          ctx.strokeStyle = "#0066cc";
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();

          const center = screen(0, 0);
          const focalPoint = screen(radiusOfCurvature / 2, 0);

          ctx.fillStyle = "#0066cc";
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(center.x, center.y, 5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ff6600";
          ctx.beginPath();
          ctx.arc(focalPoint.x, focalPoint.y, 5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.font = "12px Arial";
          ctx.textAlign = "center";
          ctx.fillText("C", center.x, center.y - 10);
          ctx.fillText("F", focalPoint.x, focalPoint.y - 10);

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

            // remap the source image pixel-by-pixel through the mirror equations
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
              const R = radiusOfCurvature;
              const mirrorX = Math.sqrt(R * R - objPos.y * objPos.y);
              const mirrorY = objPos.y;

              ctx.strokeStyle = "#ff4444";
              ctx.lineWidth = 3;
              ctx.setLineDash([]);

              const ray1Start = screen(objPos.x, objPos.y);
              const ray1Mirror = screen(mirrorX, mirrorY);

              ctx.beginPath();
              ctx.moveTo(ray1Start.x, ray1Start.y);
              ctx.lineTo(ray1Mirror.x, ray1Mirror.y);
              ctx.stroke();

              const normalX = mirrorX - 0;
              const normalY = mirrorY - 0;
              const normalLength = Math.sqrt(
                normalX * normalX + normalY * normalY
              );
              const unitNormalX = normalX / normalLength;
              const unitNormalY = normalY / normalLength;

              const incidentX = mirrorX - objPos.x;
              const incidentY = mirrorY - objPos.y;

              const dotProduct =
                incidentX * unitNormalX + incidentY * unitNormalY;
              const reflectedX = incidentX - 2 * dotProduct * unitNormalX;
              const reflectedY = incidentY - 2 * dotProduct * unitNormalY;

              const reflectedLength = 2;
              const reflectedMagnitude = Math.sqrt(
                reflectedX * reflectedX + reflectedY * reflectedY
              );
              const ray1ReflectedEnd = screen(
                mirrorX + (reflectedX / reflectedMagnitude) * reflectedLength,
                mirrorY + (reflectedY / reflectedMagnitude) * reflectedLength
              );

              ctx.beginPath();
              ctx.moveTo(ray1Mirror.x, ray1Mirror.y);
              ctx.lineTo(ray1ReflectedEnd.x, ray1ReflectedEnd.y);
              ctx.stroke();

              const extendedLength = 10;
              const ray1ExtendedEnd = screen(
                mirrorX - (reflectedX / reflectedMagnitude) * extendedLength,
                mirrorY - (reflectedY / reflectedMagnitude) * extendedLength
              );

              // dashed backward extension showing the virtual image geometry
              ctx.strokeStyle = "#ff4444";
              ctx.lineWidth = 3;
              ctx.setLineDash([8, 4]);
              ctx.beginPath();
              ctx.moveTo(ray1Mirror.x, ray1Mirror.y);
              ctx.lineTo(ray1ExtendedEnd.x, ray1ExtendedEnd.y);
              ctx.stroke();

              ctx.strokeStyle = "#00ff00";
              ctx.lineWidth = 2;
              ctx.setLineDash([4, 4]);

              const normalVectorX = mirrorX - 0;
              const normalVectorY = mirrorY - 0;
              const normalVectorLength = Math.sqrt(
                normalVectorX * normalVectorX + normalVectorY * normalVectorY
              );

              const extendedNormalLength = 0.3;
              const extendedNormalX =
                mirrorX +
                (normalVectorX / normalVectorLength) * extendedNormalLength;
              const extendedNormalY =
                mirrorY +
                (normalVectorY / normalVectorLength) * extendedNormalLength;

              ctx.beginPath();
              ctx.moveTo(center.x, center.y);
              ctx.lineTo(
                screen(extendedNormalX, extendedNormalY).x,
                screen(extendedNormalX, extendedNormalY).y
              );
              ctx.stroke();

              const ray2Start = screen(objPos.x, objPos.y);
              const ray2Center = screen(0, 0);

              ctx.beginPath();
              ctx.moveTo(ray2Start.x, ray2Start.y);
              ctx.lineTo(ray2Center.x, ray2Center.y);
              ctx.stroke();

              const ray2MirrorX = Math.sqrt(R * R - objPos.y * objPos.y);
              const ray2MirrorY = objPos.y;

              const ray2NormalVectorX = ray2MirrorX - 0;
              const ray2NormalVectorY = ray2MirrorY - 0;
              const ray2NormalVectorLength = Math.sqrt(
                ray2NormalVectorX * ray2NormalVectorX +
                  ray2NormalVectorY * ray2NormalVectorY
              );

              const ray2ExtendedNormalLength = 0.3;
              const ray2ExtendedNormalX =
                ray2MirrorX +
                (ray2NormalVectorX / ray2NormalVectorLength) *
                  ray2ExtendedNormalLength;
              const ray2ExtendedNormalY =
                ray2MirrorY +
                (ray2NormalVectorY / ray2NormalVectorLength) *
                  ray2ExtendedNormalLength;

              ctx.strokeStyle = "#00ff00";
              ctx.lineWidth = 2;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(center.x, center.y);
              ctx.lineTo(
                screen(ray2ExtendedNormalX, ray2ExtendedNormalY).x,
                screen(ray2ExtendedNormalX, ray2ExtendedNormalY).y
              );
              ctx.stroke();

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
                    Information
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
                      Mirror Properties:
                    </div>
                    <div className="text-center text-black dark:text-white">
                      R = radius of curvature
                    </div>
                    <div className="text-center text-black dark:text-white">
                      f = R/2 (focal length)
                    </div>
                    <div className="text-xs mt-1 text-yellow-600 dark:text-yellow-400">
                      Center of curvature at origin
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-600 p-3 bg-gray-50 dark:bg-gray-900">
                    <div className="font-bold text-black dark:text-white">
                      Image Formation:
                    </div>
                    <div className="text-center text-black dark:text-white">
                      All images are virtual (X &gt; 0, behind mirror)
                    </div>
                    <div className="text-center text-black dark:text-white">
                      Images are upright and diminished
                    </div>
                    <div className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                      Each pixel follows convex mirror equations
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <div>• Convex mirror forms virtual, upright images</div>
                    <div>• Center of curvature at origin (0, 0)</div>
                    <div>• Focal point at (R/2, 0) behind mirror</div>
                    <div>• Image formed using convex mirror equations</div>
                    <div className="mt-2 p-2 bg-gray-800 rounded border border-gray-600">
                      <div className="font-mono text-xs">
                        <div>α = (1/2) × tan⁻¹(y/x)</div>
                        <div>k = x / cos(2α)</div>
                        <div>
                          Y = (k × sin(α)) / (k/R - cos(α) + (x/y) × sin(α))
                        </div>
                        <div>X = x - Y/y</div>
                      </div>
                    </div>
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

export default function ConvexSphericalMirror() {
  return <ConvexMirrorSimulation />;
}
