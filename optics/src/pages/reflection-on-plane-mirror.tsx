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

interface MirrorSimulationProps {
  mirrorX?: number;
}

const MirrorSimulation: React.FC<MirrorSimulationProps> = () => {
  const { setTheme } = useTheme();
  setTheme("dark");

  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imgPos, setImgPos] = useState({ x: 1, y: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);

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

  return (
    <div>
      <NavigationMenu viewport={false} className="z-10 p-1 m-auto bg-black">
        <NavigationMenuList>
          <NavigationMenuItem>
            <input type="file" accept="image/*" onChange={handleFileChange} />
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

          const imgW = 1;
          const imgH = 1;

          if (
            mouseWorld.x >= imgPos.x - imgW / 2 &&
            mouseWorld.x <= imgPos.x + imgW / 2 &&
            mouseWorld.y >= imgPos.y - imgH / 2 &&
            mouseWorld.y <= imgPos.y + imgH / 2
          ) {
            setIsDragging(true);
            dragOffset.current = {
              x: mouseWorld.x - imgPos.x,
              y: mouseWorld.y - imgPos.y,
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
          setImgPos({
            x: mouseWorld.x - dragOffset.current.x,
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

          const p1 = screen(0, -10000),
            p2 = screen(0, 10000);
          ctx.strokeStyle = "red";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          if (imageSrc) {
            if (!imgRef.current) {
              imgRef.current = new Image();
              imgRef.current.src = imageSrc;
            }
            const img = imgRef.current;
            const imgW = 1;
            const imgH = 1;

            const screenPos = screen(imgPos.x - imgW / 2, imgPos.y + imgH / 2);
            const wPx = imgW * vp.scale;
            const hPx = imgH * vp.scale;

            ctx.drawImage(img, screenPos.x, screenPos.y, wPx, hPx);

            const reflectedX = -imgPos.x;
            const reflectedScreenPos = screen(
              reflectedX + imgW / 2,
              imgPos.y + imgH / 2
            );

            ctx.save();
            ctx.scale(-1, 1); // Flip horizontally
            ctx.drawImage(
              img,
              -reflectedScreenPos.x,
              reflectedScreenPos.y,
              wPx,
              hPx
            );
            ctx.restore();
          }
        }}
      />
    </div>
  );
};

export default function ReflectionOnPlaneMirror() {
  return <MirrorSimulation />;
}
