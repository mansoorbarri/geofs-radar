"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { isAdmin } from "~/app/actions/is-pro";
import {
  getPendingAircraftImages,
  getApprovedAircraftImages,
  approveAircraftImage,
  rejectAircraftImage,
  deleteAircraftImage,
  type AircraftImage,
} from "~/app/actions/aircraft-images";
import { Trash2, Check, X, Plane, Clock, CheckCircle } from "lucide-react";
import Loading from "~/components/loading";
import Image from "next/image";
import { UserAuth } from "~/components/atc/userAuth";

export default function AdminAircraftImagesPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [pendingImages, setPendingImages] = useState<AircraftImage[]>([]);
  const [approvedImages, setApprovedImages] = useState<AircraftImage[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      isAdmin()
        .then((admin) => {
          setIsAdminUser(admin);
          if (admin) {
            loadImages();
          } else {
            setLoading(false);
          }
        })
        .catch(() => setLoading(false));
    } else if (isLoaded) {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  async function loadImages() {
    const [pending, approved] = await Promise.all([
      getPendingAircraftImages(),
      getApprovedAircraftImages(),
    ]);
    setPendingImages(pending);
    setApprovedImages(approved);
    setLoading(false);
  }

  async function handleApprove(id: string) {
    setActionLoading(id);
    const result = await approveAircraftImage(id);
    if (result.success) {
      loadImages();
    } else {
      alert(result.error || "Failed to approve image");
    }
    setActionLoading(null);
  }

  async function handleReject(id: string) {
    if (!confirm("Are you sure you want to reject this image? It will be deleted.")) return;
    setActionLoading(id);
    const result = await rejectAircraftImage(id);
    if (result.success) {
      loadImages();
    } else {
      alert(result.error || "Failed to reject image");
    }
    setActionLoading(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this approved image?")) return;
    setActionLoading(id);
    const result = await deleteAircraftImage(id);
    if (result.success) {
      loadImages();
    } else {
      alert(result.error || "Failed to delete image");
    }
    setActionLoading(null);
  }

  if (!isLoaded || loading) {
    return <Loading />;
  }

  if (!isSignedIn || !isAdminUser) {
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
            <button
              onClick={() => router.push("/")}
              className="text-sm text-slate-400 transition-colors hover:text-white"
            >
              Back to Map
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-6 py-20 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2">
            <Plane className="h-4 w-4 text-red-400" />
            <span className="font-mono text-sm text-red-400">ACCESS DENIED</span>
          </div>

          <h1 className="mb-4 text-4xl font-bold text-white">Admin Access Required</h1>
          <p className="mb-8 text-xl text-slate-400">
            Only Admin users can approve aircraft images
          </p>

          <button
            onClick={() => router.push("/")}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-8 py-4 font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/40"
          >
            Back to Map
          </button>
        </main>
      </div>
    );
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
              onClick={() => router.push("/aircraft-images")}
              className="text-sm text-slate-400 transition-colors hover:text-white"
            >
              Public Gallery
            </button>
            <button
              onClick={() => router.push("/")}
              className="text-sm text-slate-400 transition-colors hover:text-white"
            >
              Back to Map
            </button>
            <UserAuth />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2">
            <Plane className="h-4 w-4 text-cyan-400" />
            <span className="font-mono text-sm text-cyan-400">ADMIN PANEL</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Manage Aircraft Images</h1>
          <p className="mt-2 text-slate-400">
            Review and approve community-submitted aircraft photos
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-sm transition-all ${
              activeTab === "pending"
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-white/5 text-slate-400 hover:bg-white/10"
            }`}
          >
            <Clock className="h-4 w-4" />
            Pending ({pendingImages.length})
          </button>
          <button
            onClick={() => setActiveTab("approved")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-sm transition-all ${
              activeTab === "approved"
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-white/5 text-slate-400 hover:bg-white/10"
            }`}
          >
            <CheckCircle className="h-4 w-4" />
            Approved ({approvedImages.length})
          </button>
        </div>

        {/* Pending Images */}
        {activeTab === "pending" && (
          <>
            {pendingImages.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-12 text-center backdrop-blur-xl">
                <Clock className="mx-auto mb-4 h-12 w-12 text-slate-600" />
                <h3 className="mb-2 text-xl font-semibold text-white">No Pending Images</h3>
                <p className="text-slate-400">All submissions have been reviewed</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pendingImages.map((image) => (
                  <div
                    key={image.id}
                    className="group overflow-hidden rounded-2xl border border-yellow-500/30 bg-black/40 backdrop-blur-xl"
                  >
                    <div className="relative aspect-video">
                      <Image
                        src={image.imageUrl}
                        alt={`${image.airlineIata || image.airlineIcao} ${image.aircraftType}`}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-2 left-2 rounded-md bg-yellow-500/80 px-2 py-1 text-xs font-bold text-black">
                        PENDING
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="mb-3 flex items-center gap-2 flex-wrap">
                        {image.airlineIata && (
                          <span className="rounded-md bg-cyan-500/20 px-2 py-1 font-mono text-sm font-bold text-cyan-400">
                            {image.airlineIata}
                          </span>
                        )}
                        {image.airlineIcao && (
                          <span className="rounded-md bg-blue-500/20 px-2 py-1 font-mono text-sm font-bold text-blue-400">
                            {image.airlineIcao}
                          </span>
                        )}
                        <span className="rounded-md bg-white/10 px-2 py-1 font-mono text-sm text-white">
                          {image.aircraftType}
                        </span>
                      </div>
                      {image.photographer && (
                        <p className="mb-3 text-xs text-slate-500">
                          Photo by {image.photographer}
                        </p>
                      )}
                      <p className="mb-3 text-xs text-slate-500">
                        Uploaded {new Date(image.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(image.id)}
                          disabled={actionLoading === image.id}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-500/20 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(image.id)}
                          disabled={actionLoading === image.id}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-500/20 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Approved Images */}
        {activeTab === "approved" && (
          <>
            {approvedImages.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-12 text-center backdrop-blur-xl">
                <Plane className="mx-auto mb-4 h-12 w-12 text-slate-600" />
                <h3 className="mb-2 text-xl font-semibold text-white">No Approved Images</h3>
                <p className="text-slate-400">Approve some pending images to see them here</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {approvedImages.map((image) => (
                  <div
                    key={image.id}
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl transition-all hover:border-cyan-500/30"
                  >
                    <div className="relative aspect-video">
                      <Image
                        src={image.imageUrl}
                        alt={`${image.airlineIata || image.airlineIcao} ${image.aircraftType}`}
                        fill
                        className="object-cover"
                      />
                      <button
                        onClick={() => handleDelete(image.id)}
                        disabled={actionLoading === image.id}
                        className="absolute top-2 right-2 rounded-lg bg-red-500/80 p-2 opacity-0 transition-all hover:bg-red-500 group-hover:opacity-100 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4 text-white" />
                      </button>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {image.airlineIata && (
                          <span className="rounded-md bg-cyan-500/20 px-2 py-1 font-mono text-sm font-bold text-cyan-400">
                            {image.airlineIata}
                          </span>
                        )}
                        {image.airlineIcao && (
                          <span className="rounded-md bg-blue-500/20 px-2 py-1 font-mono text-sm font-bold text-blue-400">
                            {image.airlineIcao}
                          </span>
                        )}
                        <span className="rounded-md bg-white/10 px-2 py-1 font-mono text-sm text-white">
                          {image.aircraftType}
                        </span>
                        <CheckCircle className="ml-auto h-4 w-4 text-emerald-400" />
                      </div>
                      {image.photographer && (
                        <p className="mt-2 text-xs text-slate-500">
                          Photo by {image.photographer}
                        </p>
                      )}
                      {image.approvedAt && (
                        <p className="mt-1 text-xs text-slate-600">
                          Approved {new Date(image.approvedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
