export function isCloudinaryImageUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== "https:") return false
    return (
      u.hostname === "res.cloudinary.com" ||
      u.hostname.endsWith(".res.cloudinary.com")
    )
  } catch {
    return false
  }
}
