import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const ViewMap = ({ trip }) => {
  const mapContainerRef = useRef(null);
  const defaultCenter = [34.7818, 32.0853];

  useEffect(() => {
    const { vacation_location, geo_coordinates } = trip || {};
    const center = geo_coordinates || defaultCenter;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: center,
      zoom: 2,
      projection: 'globe',
    });

    // הוסף מקור DEM לפני שמגדירים Terrain
    map.on('load', () => {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });

      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
      map.setFog({}); // מוסיף אפקט ערפל
    });

    if (geo_coordinates) {
      new mapboxgl.Marker()
        .setLngLat(geo_coordinates)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setText(
            `Destination: ${vacation_location}`
          )
        )
        .addTo(map);
    }

    map.dragRotate.enable();
    map.touchZoomRotate.enableRotation();
    map.addControl(new mapboxgl.NavigationControl());
    map.addControl(new mapboxgl.FullscreenControl());

    return () => map.remove();
  }, [trip]);

  return (
    <div style={{ width: '100%', height: '450px' }} ref={mapContainerRef}>
      {/* Map container */}
    </div>
  );
};

export default ViewMap;
