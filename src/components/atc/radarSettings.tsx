"use client";

import React, { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useUploadThing } from "~/utils/uploadthing";
import { getUserProfile } from "~/app/actions/get-user-profile";
import { removeAirlineLogo } from "~/app/actions/remove-airline-logo";
import { toast } from "sonner";
import Image from "next/image";

interface Profile {
  role: string;
  radarKey: string;
  googleId: string | null;
  airlineLogo: string | null;
};

export const RadarSettings = () => {
  const { isLoaded } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isLoaded) {
      getUserProfile()
        .then((data) => {
          if (data) {
            setProfile({
              role: data.role,
              radarKey: data.radarKey,
              googleId: data.googleId ?? null,
              airlineLogo: data.airlineLogo ?? null,
            });
          }
        })
        .catch(() => toast.error("FAILED TO LOAD PROFILE"));
    }
  }, [isLoaded]);

  const { startUpload, isUploading } = useUploadThing(
    "airlineLogoUploader",
    {
      onUploadProgress: (p) => setProgress(p),
      onClientUploadComplete: () => {
        setProgress(0);
        toast.success("LOGO UPDATED");
      },
      onUploadError: (e) => {
        setProgress(0);
        toast.error(e.message.toUpperCase());
      },
    },
  );

  const handleRemoveLogo = async () => {
    try {
      await removeAirlineLogo();
      setProfile((p) =>
        p ? { ...p, airlineLogo: null } : p,
      );
      toast.success("LOGO REMOVED");
    } catch {
      toast.error("FAILED TO REMOVE LOGO");
    }
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.googleId) return;

    if (file.type !== "image/png") {
      toast.error("PNG FILES ONLY");
      return;
    }

    await startUpload([file], {
      customId: profile.googleId,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!isLoaded || !profile) return null;

  const isPremium = profile.role === "PREMIUM";

  return (
    <div className="flex flex-col gap-4 p-4 rounded-md border border-cyan-400/30 bg-black/90 font-mono text-cyan-400 shadow-xl backdrop-blur-md">
      <h3 className="text-[14px] font-bold uppercase tracking-widest text-white">
        RADAR CONFIGURATION
      </h3>

      <div className="space-y-2">
        <label className="text-[10px] uppercase text-cyan-400/60">
          YOUR RADAR KEY
        </label>
        <input
          readOnly
          value={profile.radarKey}
          className="w-full bg-black/50 border border-cyan-400/20 px-2 py-1 text-xs"
        />
      </div>

      <div className="pt-4 border-t border-white/10">
        <label className="text-[10px] uppercase text-cyan-400/60">
          AIRLINE LOGO (PNG)
        </label>
        {isPremium ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png"
              onChange={handleFileChange}
              className="hidden"
            />

            {profile.airlineLogo ? (
              <div className="mt-2 space-y-2">
                <Image
                  src={profile.airlineLogo}
                  alt="Airline Logo"
                  width={96}
                  height={48}
                  className="h-12 w-auto object-contain border border-cyan-400/20 bg-black/50 p-1"
                />

                <div className="flex gap-2">
                  <button
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 bg-cyan-400 text-black text-[11px] font-bold py-2"
                  >
                    CHANGE LOGO
                  </button>

                  <button
                    onClick={handleRemoveLogo}
                    className="flex-1 bg-red-500/80 text-black text-[11px] font-bold py-2"
                  >
                    REMOVE
                  </button>
                </div>
              </div>
            ) : (
              <button
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 w-full bg-cyan-400 text-black text-[11px] font-bold py-2"
              >
                {isUploading ? `UPLOADING ${progress}%` : "UPLOAD LOGO"}
              </button>
            )}

            {isUploading && (
              <div className="w-full h-1 bg-white/10 mt-2">
                <div
                  className="h-full bg-cyan-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </>
        ) : (
          <div className="mt-2 text-yellow-500/70 text-xs">
            PREMIUM REQUIRED
          </div>
        )}
      </div>
    </div>
  );
};