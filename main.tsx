import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";   // ← correct import
//import { RouterProvider } from "react-router";                  // ← point to your router.ts file
import "./styles/index.css";
import { router } from "./app/routes";

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />
);