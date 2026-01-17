"use client";

import { useRouter } from "next/navigation";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import {
  getApprovedAircraftImages,
  createAircraftImage,
  type AircraftImage,
} from "~/app/actions/aircraft-images";
import { Upload, Plane, Check, Clock } from "lucide-react";
import Loading from "~/components/loading";
import Image from "next/image";
import { UserAuth } from "~/components/atc/userAuth";
import { UploadDropzone } from "~/lib/uploadthing";

export default function AircraftImagesPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<AircraftImage[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [formData, setFormData] = useState({
    airlineIata: "",
    aircraftType: "",
    imageUrl: "",
    imageKey: "",
    photographer: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadImages();
  }, []);

  async function loadImages() {
    const data = await getApprovedAircraftImages();
    setImages(data);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.imageUrl) {
      setError("Please upload an image first");
      return;
    }
    setSubmitting(true);
    setError(null);

    const result = await createAircraftImage({
      airlineIata: formData.airlineIata,
      aircraftType: formData.aircraftType,
      imageUrl: formData.imageUrl,
      imageKey: formData.imageKey || undefined,
      photographer: formData.photographer || undefined,
    });

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        setShowUploadModal(false);
        setFormData({ airlineIata: "", aircraftType: "", imageUrl: "", imageKey: "", photographer: "" });
        setSuccess(false);
      }, 2000);
    } else {
      setError(result.error || "Failed to submit image");
    }
    setSubmitting(false);
  }

  if (!isLoaded || loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <button
            onClick={() => router.push("/")}
            className="font-mono text-xl text-cyan-400"
          >
            <Image src="/logo-white.svg" alt="RadarThing" width={100} height={30} />
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="text-sm text-slate-400 transition-colors hover:text-white"
            >
              Back to Map
            </button>
            {isSignedIn ? <UserAuth /> : (
              <SignInButton mode="modal">
                <button className="rounded-lg bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-400 transition-colors hover:bg-cyan-500/30">
                  Sign In
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2">
              <Plane className="h-4 w-4 text-cyan-400" />
              <span className="font-mono text-sm text-cyan-400">AIRCRAFT GALLERY</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Aircraft Images</h1>
            <p className="mt-2 text-slate-400">
              Community-contributed aircraft photos. Upload your own!
            </p>
          </div>
          {isSignedIn ? (
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/40"
            >
              <Upload className="h-5 w-5" />
              Upload Image
            </button>
          ) : (
            <SignInButton mode="modal">
              <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/40">
                <Upload className="h-5 w-5" />
                Sign in to Upload
              </button>
            </SignInButton>
          )}
        </div>

        {images.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-12 text-center backdrop-blur-xl">
            <Plane className="mx-auto mb-4 h-12 w-12 text-slate-600" />
            <h3 className="mb-2 text-xl font-semibold text-white">No Images Yet</h3>
            <p className="text-slate-400">Be the first to contribute an aircraft image!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image) => (
              <div
                key={image.id}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl transition-all hover:border-cyan-500/30"
              >
                <div className="relative aspect-video">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.imageUrl}
                    alt={`${image.airlineIata} ${image.aircraftType}`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-cyan-500/20 px-2 py-1 font-mono text-sm font-bold text-cyan-400">
                      {image.airlineIata}
                    </span>
                    <span className="rounded-md bg-white/10 px-2 py-1 font-mono text-sm text-white">
                      {image.aircraftType}
                    </span>
                    <Check className="ml-auto h-4 w-4 text-emerald-400" />
                  </div>
                  {image.photographer && (
                    <p className="mt-2 text-xs text-slate-500">
                      Photo by {image.photographer}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0f14] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowUploadModal(false);
                setError(null);
                setSuccess(false);
                setFormData({ airlineIata: "", aircraftType: "", imageUrl: "", imageKey: "", photographer: "" });
              }}
              className="absolute top-4 right-4 text-slate-400 transition-colors hover:text-white"
            >
              ✕
            </button>

            <h2 className="mb-2 text-xl font-bold text-white">Upload Aircraft Image</h2>
            <p className="mb-6 text-sm text-slate-400">
              Your image will be reviewed by our team before appearing in the gallery.
            </p>

            {success ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="mb-4 rounded-full bg-emerald-500/20 p-4">
                  <Clock className="h-8 w-8 text-emerald-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">Submitted for Review</h3>
                <p className="text-center text-sm text-slate-400">
                  Your image has been submitted and is pending approval.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block font-mono text-xs text-slate-400">
                      AIRLINE IATA CODE
                    </label>
                    <input
                      type="text"
                      value={formData.airlineIata}
                      onChange={(e) =>
                        setFormData({ ...formData, airlineIata: e.target.value.toUpperCase() })
                      }
                      placeholder="e.g., EK"
                      maxLength={3}
                      required
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white placeholder-slate-500 outline-none transition-all focus:border-cyan-500/50"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block font-mono text-xs text-slate-400">
                      AIRCRAFT TYPE
                    </label>
                    <input
                      type="text"
                      value={formData.aircraftType}
                      onChange={(e) =>
                        setFormData({ ...formData, aircraftType: e.target.value.toUpperCase() })
                      }
                      placeholder="e.g., A350"
                      maxLength={10}
                      required
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white placeholder-slate-500 outline-none transition-all focus:border-cyan-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block font-mono text-xs text-slate-400">
                    PHOTOGRAPHER (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    value={formData.photographer}
                    onChange={(e) =>
                      setFormData({ ...formData, photographer: e.target.value })
                    }
                    placeholder="Photo credit"
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white placeholder-slate-500 outline-none transition-all focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block font-mono text-xs text-slate-400">
                    UPLOAD IMAGE
                  </label>
                  {formData.imageUrl ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formData.imageUrl}
                        alt="Preview"
                        className="w-full rounded-lg border border-white/10 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, imageUrl: "", imageKey: "" })}
                        className="absolute top-2 right-2 rounded-lg bg-red-500/80 px-3 py-1 text-sm text-white hover:bg-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <UploadDropzone
                      endpoint="aircraftImageUploader"
                      onClientUploadComplete={(res) => {
                        if (res?.[0]) {
                          setFormData({
                            ...formData,
                            imageUrl: res[0].ufsUrl,
                            imageKey: res[0].key,
                          });
                        }
                      }}
                      onUploadError={(error: Error) => {
                        setError(error.message);
                      }}
                      className="border-white/10 bg-black/20 ut-button:bg-cyan-500 ut-button:hover:bg-cyan-600 ut-label:text-slate-400 ut-allowed-content:text-slate-500"
                    />
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || !formData.imageUrl}
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/40 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit for Review"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
