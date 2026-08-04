"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { isStorageKey } from "@/lib/utils/storage-key";

type ProfileImageProps = {
  image?: string | null;
  name?: string | null;
  email?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
};

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (!email) return "U";
  return email.slice(0, 2).toUpperCase();
}

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-16 text-base",
};

export function ProfileImage({
  image,
  name,
  email,
  className,
  size = "md",
}: ProfileImageProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolveImage() {
      if (!image) {
        setResolvedUrl(null);
        return;
      }

      if (image.startsWith("http://") || image.startsWith("https://") || image.startsWith("/")) {
        setResolvedUrl(image);
        return;
      }

      if (!isStorageKey(image)) {
        setResolvedUrl(image);
        return;
      }

      try {
        const res = await fetch("/api/files/access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope: "profile" }),
        });
        const json = await res.json();
        if (!cancelled && json.success && json.data?.url) {
          setResolvedUrl(json.data.url as string);
        }
      } catch {
        if (!cancelled) setResolvedUrl(null);
      }
    }

    void resolveImage();
    return () => {
      cancelled = true;
    };
  }, [image]);

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {resolvedUrl ? <AvatarImage src={resolvedUrl} alt={name ?? "Profile"} /> : null}
      <AvatarFallback className="bg-emerald-100 text-emerald-800">
        {getInitials(name, email)}
      </AvatarFallback>
    </Avatar>
  );
}
