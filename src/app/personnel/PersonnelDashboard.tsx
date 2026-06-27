"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import L, { type LayerGroup, type Map } from "leaflet";

// Fix Leaflet default marker icon paths for webpack/Next.js
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

interface Address {
  id: number;
  firmaAdi: string;
  adres: string;
  ilceMahalle: string;
  lat: number;
  lng: number;
}

const DEFAULT_CENTER: [number, number] = [40.9919, 29.2311];

const MOCK_ADDRESSES: Address[] = [
  {
    id: 1,
    firmaAdi: "Çilek Konsept",
    adres: "Sevenler Caddesi No:26",
    ilceMahalle: "Sancaktepe, İstanbul",
    lat: 40.9919,
    lng: 29.2311,
  },
  {
    id: 2,
    firmaAdi: "ABC Market",
    adres: "Abdurrahmangazi Mahallesi",
    ilceMahalle: "Sancaktepe, İstanbul",
    lat: 40.9878,
    lng: 29.2269,
  },
  {
    id: 3,
    firmaAdi: "Demir Tekstil",
    adres: "Fatih Mahallesi",
    ilceMahalle: "Sancaktepe, İstanbul",
    lat: 40.9935,
    lng: 29.2452,
  },
];

export default function PersonnelDashboard() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loaded, setLoaded] = useState(false);
  const leafletMapRef = useRef<Map | null>(null);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const markerLayerRef = useRef<LayerGroup | null>(null);

  const handleUpdate = useCallback(() => {
    setAddresses(MOCK_ADDRESSES);
    setLoaded(true);
  }, []);

  const center: [number, number] = useMemo(() => {
    if (addresses.length === 0) return DEFAULT_CENTER;
    const avgLat =
      addresses.reduce((sum, a) => sum + a.lat, 0) / addresses.length;
    const avgLng =
      addresses.reduce((sum, a) => sum + a.lng, 0) / addresses.length;
    return [avgLat, avgLng];
  }, [addresses]);

  const openGoogleMaps = useCallback((lat: number, lng: number) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      "_blank"
    );
  }, []);

  useEffect(() => {
    if (!mapElementRef.current || leafletMapRef.current) return;

    const map = L.map(mapElementRef.current, {
      center: DEFAULT_CENTER,
      zoom: 15,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    markerLayerRef.current = L.layerGroup().addTo(map);
    leafletMapRef.current = map;

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      leafletMapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = leafletMapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;

    markerLayer.clearLayers();

    addresses.forEach((addr) => {
      const popupContent = document.createElement("div");
      popupContent.className = "flex flex-col gap-1.5 text-sm min-w-[180px]";

      const title = document.createElement("p");
      title.className = "font-semibold text-zinc-900";
      title.textContent = addr.firmaAdi;

      const address = document.createElement("p");
      address.className = "text-zinc-600 text-xs";
      address.textContent = addr.adres;

      const district = document.createElement("p");
      district.className = "text-zinc-500 text-xs";
      district.textContent = addr.ilceMahalle;

      const routeButton = document.createElement("button");
      routeButton.type = "button";
      routeButton.className =
        "mt-1 w-full text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors";
      routeButton.textContent = "Rota Oluştur";
      routeButton.addEventListener("click", () =>
        openGoogleMaps(addr.lat, addr.lng)
      );

      popupContent.append(title, address, district, routeButton);

      L.marker([addr.lat, addr.lng])
        .bindPopup(popupContent)
        .addTo(markerLayer);
    });

    map.setView(center, map.getZoom());
    setTimeout(() => map.invalidateSize(), 100);
  }, [addresses, center, openGoogleMaps]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-white">
      {/* Map */}
      <div className="absolute inset-0 h-full w-full">
        <div ref={mapElementRef} className="h-full w-full" />
      </div>

      {/* Top overlay */}
      <div className="fixed top-4 left-4 right-4 z-[1000] pointer-events-none">
        <div className="pointer-events-auto bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              Alisa
            </h1>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Bugünkü adreslerim
            </span>
          </div>
          <button
            type="button"
            onClick={handleUpdate}
            className="pointer-events-auto text-xs font-medium text-white bg-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 px-3 py-1.5 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Güncelle
          </button>
        </div>
      </div>

      {/* Bottom status card */}
      <div className="fixed bottom-4 left-4 right-4 z-[1000] pointer-events-none">
        <div className="pointer-events-auto bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Atanan adres sayısı
              </p>
              <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {loaded ? addresses.length : 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Kalan adres sayısı
              </p>
              <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {loaded ? addresses.length : 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}