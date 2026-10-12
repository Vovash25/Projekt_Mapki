const BUILDING_BOUNDS = L.latLngBounds(
  [53.42310, 14.53424],
  [53.42414, 14.53542]
);

const FIT_PADDING_TOP_LEFT = [16, 80];
const FIT_PADDING_BOTTOM_RIGHT = [16, 16];

const map = L.map("map", {
  zoomControl: false,
  zoomSnap: 0,
  zoomDelta: 0.5,
  attributionControl: true,
});

L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    maxNativeZoom: 19,
    maxZoom: 21,
    attribution: "Tiles © Esri",
  }
).addTo(map);

let mapInset = { right: 0, bottom: 0 };

function fitBuilding(animate = false) {
  map.fitBounds(BUILDING_BOUNDS, {
    paddingTopLeft: FIT_PADDING_TOP_LEFT,
    paddingBottomRight: [
      FIT_PADDING_BOTTOM_RIGHT[0] + mapInset.right,
      FIT_PADDING_BOTTOM_RIGHT[1] + mapInset.bottom,
    ],
    animate,
  });
}

window.setMapInset = function ({ right = 0, bottom = 0 }) {
  right = Math.max(0, Math.round(right));
  bottom = Math.max(0, Math.round(bottom));
  if (right === mapInset.right && bottom === mapInset.bottom) return;
  mapInset = { right, bottom };
  fitBuilding(true);
};

fitBuilding();

let resizeTimer;
new ResizeObserver(() => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    map.invalidateSize({ animate: false });
    fitBuilding();
  }, 100);
}).observe(document.getElementById("map"));
