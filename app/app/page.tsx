import { redirect } from "next/navigation";

// The editor now lives at `/` directly (Excalidraw-style: no marketing wall
// before you can write). This keeps old bookmarks/links working.
export default function AppRedirect() {
  redirect("/");
}
