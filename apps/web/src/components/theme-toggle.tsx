"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { useTheme } from "next-themes";
import { cn } from "@/utils/ui";
import { Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface ThemeToggleProps {
	className?: string;
	iconClassName?: string;
	onToggle?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export function ThemeToggle({
	className,
	iconClassName,
	onToggle,
}: ThemeToggleProps) {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	return (
		<Button
			size="icon"
			variant="ghost"
			className={cn("size-8", className)}
			onClick={(e) => {
				setTheme(theme === "dark" ? "light" : "dark");
				onToggle?.(e);
			}}
		>
			<HugeiconsIcon icon={Sun03Icon} className={cn("!size-[1.1rem]", iconClassName)} />
			{/* mounted 守卫：SSR/客户端首次渲染都渲染空占位，避免 next-themes
			    读取 localStorage 偏好后与服务端文本不一致导致 hydration 失败 */}
			<span className="sr-only">{mounted ? (theme === "dark" ? "Light" : "Dark") : ""}</span>
		</Button>
	);
}
