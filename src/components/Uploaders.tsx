"use client";
import FileUploader from "./FileUploader";
import { attachProductImage, submitVerificationDoc } from "@/app/dashboard/upload-actions";

export function ProductImageUploader({ userId, productId, hasImage }: { userId: string; productId: string; hasImage: boolean }) {
  return <FileUploader bucket="product-images" userId={userId} accept="image/jpeg,image/png,image/webp" maxBytes={2_000_000}
    label={hasImage ? "Replace image (JPG/PNG/WebP, max 2 MB)" : "Add image (JPG/PNG/WebP, max 2 MB)"} onDone={(path) => attachProductImage(productId, path)} />;
}
export function VerificationUploader({ userId, businessId }: { userId: string; businessId: string }) {
  return <FileUploader bucket="verification-docs" userId={userId} accept="application/pdf,image/jpeg,image/png" maxBytes={5_000_000}
    label="Upload business registration / ID document (PDF or image, max 5 MB)" onDone={(path) => submitVerificationDoc(businessId, path)} />;
}
