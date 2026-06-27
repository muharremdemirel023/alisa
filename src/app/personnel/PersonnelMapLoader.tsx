"use client";

import dynamic from "next/dynamic";

const PersonnelDashboard = dynamic(() => import("./PersonnelDashboard"), {
  ssr: false,
});

export default function PersonnelMapLoader() {
  return <PersonnelDashboard />;
}