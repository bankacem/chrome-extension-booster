if (process.env.VERCEL === "1") {
  console.log("Skipping local image optimization on Vercel; committed derivatives are used.");
} else {
  await import("./optimize-images.mjs");
}
