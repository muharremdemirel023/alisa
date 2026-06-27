declare module "leaflet" {
  type LatLngExpression = readonly [number, number] | readonly [number, number, number];

  interface MapOptions {
    center?: LatLngExpression;
    zoom?: number;
    zoomControl?: boolean;
  }

  interface IconOptions {
    iconUrl?: string;
    iconRetinaUrl?: string;
    shadowUrl?: string;
    iconSize?: [number, number];
    iconAnchor?: [number, number];
    popupAnchor?: [number, number];
    shadowSize?: [number, number];
  }

  type Icon = object;

  interface MarkerOptions {
    icon?: Icon;
  }

  interface Layer {
    addTo(map: Map | LayerGroup): this;
  }

  interface LayerGroup extends Layer {
    clearLayers(): this;
  }

  interface Map {
    invalidateSize(): this;
    remove(): void;
    setView(center: LatLngExpression, zoom?: number): this;
    getZoom(): number;
  }

  interface Marker extends Layer {
    bindPopup(content: HTMLElement | string): this;
  }

  interface MarkerConstructor {
    prototype: {
      options: MarkerOptions;
    };
    new (latlng: LatLngExpression, options?: MarkerOptions): Marker;
  }

  interface TileLayerOptions {
    attribution?: string;
  }

  interface LeafletStatic {
    icon(options: IconOptions): Icon;
    map(element: HTMLElement, options?: MapOptions): Map;
    tileLayer(url: string, options?: TileLayerOptions): Layer;
    layerGroup(): LayerGroup;
    marker(latlng: LatLngExpression, options?: MarkerOptions): Marker;
    Marker: MarkerConstructor;
  }

  const L: LeafletStatic;

  export default L;
  export type { Map, LayerGroup, Layer, Marker, Icon, LatLngExpression };
}

declare module "react-leaflet" {
  import type { ComponentType, ReactNode } from "react";

  type ReactLeafletProps = Record<string, unknown>;

  export const MapContainer: ComponentType<
    ReactLeafletProps & { children?: ReactNode }
  >;
  export const TileLayer: ComponentType<ReactLeafletProps>;
  export const Marker: ComponentType<
    ReactLeafletProps & { children?: ReactNode }
  >;
  export const Popup: ComponentType<
    ReactLeafletProps & { children?: ReactNode }
  >;
}
