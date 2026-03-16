import React, { useState, useEffect } from 'react';
import PlotComponent from 'react-plotly.js';
import { MapContainer, ImageOverlay, GeoJSON, useMap } from 'react-leaflet';
import { Database, Map as MapIcon, Image as ImageIcon, Archive } from 'lucide-react';
import JSZip from 'jszip';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25,41],
    iconAnchor: [12,41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const Plot = PlotComponent.default || PlotComponent;

// Helper to fit bounds automatically
function BoundsFitter({ bounds, geoData }) {
  const map = useMap();
  useEffect(() => {
    if (geoData) {
      try {
        const layer = L.geoJSON(geoData);
        map.fitBounds(layer.getBounds(), { padding: [20, 20] });
      } catch (err) {
        if (bounds) map.fitBounds(bounds);
      }
    } else if (bounds) {
      map.fitBounds(bounds);
    }
  }, [bounds, geoData, map]);
  return null;
}

function App() {
  const [data, setData] = useState(null);
  const [geoData, setGeoData] = useState(null);
  const [bgImage, setBgImage] = useState(null);
  const [bgBounds, setBgBounds] = useState(null);
  
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [loading, setLoading] = useState(false);

  // File Handlers
  const handleJsonUpload = (e, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setter(JSON.parse(event.target.result));
    reader.readAsText(file);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBgImage(URL.createObjectURL(file));
  };

  const handleZipUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      
      const resFile = loadedZip.file('results.json');
      if (resFile) setData(JSON.parse(await resFile.async('string')));
      
      const geoFile = loadedZip.file('base_geometry.geojson');
      if (geoFile) setGeoData(JSON.parse(await geoFile.async('string')));
      
      const boundsFile = loadedZip.file('bounds.json');
      if (boundsFile) setBgBounds(JSON.parse(await boundsFile.async('string')).bounds);
      
      const bgFile = loadedZip.file('background.png');
      if (bgFile) setBgImage(URL.createObjectURL(await bgFile.async('blob')));
    } catch (err) {
      console.error(err);
      alert('Error extracting ZIP file. Make sure it contains results.json, base_geometry.geojson, bounds.json, and background.png.');
    }
    setLoading(false);
  };

  const loadDemoData = async () => {
    setLoading(true);
    try {
      const [resData, mapData, boundsData] = await Promise.all([
        fetch('/results.json').then(r => r.json()),
        fetch('/base_geometry.geojson').then(r => r.json()),
        fetch('/bounds.json').then(r => r.json())
      ]);
      setData(resData);
      setGeoData(mapData);
      setBgBounds(boundsData.bounds);
      setBgImage('/background.png');
    } catch (err) {
      console.error("Error loading demo data:", err);
      alert("Failed to load demo data. Make sure python script ran successfully.");
    }
    setLoading(false);
  };

  if (!data || !geoData || !bgBounds || !bgImage) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full border-t-8 border-blue-600">
          <h1 className="text-4xl title text-gray-800 mb-2">GSI Pareto Front Visualizer</h1>
          <p className="text-gray-600 mb-8 max-w-lg">
            Upload your complete exported zip file, individual files, or load demo data to view optimization results.
          </p>

          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <label className="flex items-center gap-2 text-sm font-bold text-blue-900 mb-2">
                <Archive size={18} />
                Quick Upload: All-in-One ZIP Archive
              </label>
              <input type="file" accept=".zip" onChange={handleZipUpload} disabled={loading}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer bg-white border border-blue-200 rounded-lg p-2" />
            </div>

            <div className="flex items-center gap-4 py-2">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-sm font-bold text-gray-400">OR UPLOAD INDIVIDUALLY</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                <Database size={18} className="text-blue-500" />
                Optimization Results (<span className="text-blue-600 font-mono">results.json</span>)
              </label>
              <input type="file" accept=".json" onChange={(e) => handleJsonUpload(e, setData)} 
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-gray-200 rounded-lg p-2" />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                <MapIcon size={18} className="text-green-500" />
                Vacant Parcels Geometry (<span className="text-green-600 font-mono">base_geometry.geojson</span>)
              </label>
              <input type="file" accept=".geojson,.json" onChange={(e) => handleJsonUpload(e, setGeoData)} 
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-bold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer border border-gray-200 rounded-lg p-2" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                  <ImageIcon size={18} className="text-orange-500" />
                  Raster Overlay PNG (<span className="text-orange-600 font-mono">image</span>)
                </label>
                <input type="file" accept="image/*" onChange={handleImageUpload} 
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-bold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer border border-gray-200 rounded-lg p-2" />
              </div>
              
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                  <MapIcon size={18} className="text-orange-500" />
                  Raster Bounds (<span className="text-orange-600 font-mono">bounds.json</span>)
                </label>
                <input type="file" accept=".json" onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => setBgBounds(JSON.parse(event.target.result).bounds);
                  reader.readAsText(file);
                }} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-bold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer border border-gray-200 rounded-lg p-2" />
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
            <span className="text-sm text-gray-500 italic">Don't have the files?</span>
            <button 
              onClick={loadDemoData}
              disabled={loading}
              className="bg-gray-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-black transition-colors flex items-center gap-2 cursor-pointer"
            >
              {loading ? 'Loading...' : 'Load Local Demo Data'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate variables for Plotly
  const x_vol = data.F.map(d => d[0]);
  const y_cool = data.F.map(d => -d[1]);
  const z_acc = data.F.map(d => -d[2]);
  
  const colors = data.F.map((_, i) => i === selectedIdx ? 'red' : 'rgba(37,99,235,0.6)');
  const sizes = data.F.map((_, i) => i === selectedIdx ? 14 : 7);

  const plotData = [{
    x: x_vol,
    y: y_cool,
    z: z_acc,
    text: data.F.map((_, i) => `Solution ${i}`),
    hoverinfo: 'text',
    mode: 'markers',
    type: 'scatter3d',
    marker: {
      symbol: 'square',
      color: colors,
      size: sizes,
      line: { color: 'rgba(0,0,0,0.5)', width: 1 }
    }
  }];

  const onPlotClick = (evt) => {
    if (evt.points && evt.points.length > 0) {
      setSelectedIdx(evt.points[0].pointNumber);
    }
  };

  const colormap = {
    0: "transparent", 
    1: "#FF239C", // PermP
    2: "#0213FF", // BioC
    3: "#FF8800"  // RainG
  };

  const styleFeature = (feature) => {
    if (selectedIdx === null) return { fillColor: '#fff', weight: 1, color:'#333', fillOpacity: 0.3 };
    const opt_id = feature.properties.opt_id;
    const choice = data.X[selectedIdx][opt_id];
    
    if (choice === 0) return { fillColor: '#fff', weight: 1, color: '#333', fillOpacity: 0.3 };
    
    return {
      fillColor: colormap[choice] || '#fff',
      weight: 1.5,
      color: '#000',
      fillOpacity: 1.0
    };
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-gray-800">
      {/* LEFT PANEL */}
      <div className="w-1/2 flex flex-col border-r border-gray-200 bg-gray-50 p-6 z-10 shadow-lg">
        <div>
          <h2 className="text-3xl title font-bold text-gray-900 mb-1">Optimization Pareto Front</h2>
          <p className="text-gray-500 text-sm mb-4">Click on a point to view its spatial GSI distribution on the map.</p>
        </div>
        
        <div className="flex-1 min-h-0 bg-white rounded-xl shadow-inner border border-gray-200 overflow-hidden relative">
          <Plot
            data={plotData}
            layout={{
              margin: { l: 0, r: 0, b: 0, t: 0 },
              paper_bgcolor: 'transparent',
              font: { family: '"PixelOperatorSC", sans-serif' },
              uirevision: 'true',
              scene: {
                xaxis: { title: 'Volume', tickformat: '.3g', exponentformat: 'e' },
                yaxis: { title: 'Cooling', tickformat: '.3g', exponentformat: 'e' },
                zaxis: { title: 'Access', tickformat: '.3g', exponentformat: 'e' }
              },
              autosize: true
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%', position:'absolute' }}
            onClick={onPlotClick}
          />
        </div>

        {/* SOLUTION DETAILS */}
        {selectedIdx !== null ? (
          <div className="mt-6 bg-white p-5 rounded-xl border border-blue-200 shadow-md">
             <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
               <h3 className="text-xl title font-bold text-blue-900 m-0">Selected Solution #{selectedIdx}</h3>
             </div>
             <div className="grid grid-cols-2 gap-4 text-sm">
               <div className="bg-gray-50 p-2 rounded"><b className="text-gray-700 block text-xs uppercase mb-1">Runoff Volume</b> {x_vol[selectedIdx]?.toFixed(3)} acre-ft</div>
               <div className="bg-gray-50 p-2 rounded"><b className="text-gray-700 block text-xs uppercase mb-1">Cooling Effect</b> {y_cool[selectedIdx]?.toFixed(3)} °C</div>
               <div className="bg-gray-50 p-2 rounded"><b className="text-gray-700 block text-xs uppercase mb-1">Access Index</b> {z_acc[selectedIdx]?.toFixed(3)}</div>
               <div className="bg-gray-50 p-2 rounded"><b className="text-gray-700 block text-xs uppercase mb-1">Total Cost</b> ${data.G.length > 0 && data.G[selectedIdx] !== undefined ? (data.G[selectedIdx][0] + (data.max_cost||0))?.toFixed(2) : "N/A"}</div>
             </div>
             
             {/* Legend mapping */}
             <div className="mt-5 flex items-center justify-center gap-6 text-sm font-bold bg-gray-50 rounded-lg p-2 border border-gray-200">
               <span className="flex items-center gap-2"><span className="w-4 h-4 inline-block border border-black shadow-sm" style={{backgroundColor:colormap[1]}}></span> PermP</span>
               <span className="flex items-center gap-2"><span className="w-4 h-4 inline-block border border-black shadow-sm" style={{backgroundColor:colormap[2]}}></span> BioC</span>
               <span className="flex items-center gap-2"><span className="w-4 h-4 inline-block border border-black shadow-sm" style={{backgroundColor:colormap[3]}}></span> RainG</span>
             </div>
          </div>
        ) : (
          <div className="mt-6 bg-gray-100 p-6 rounded-xl border border-dashed border-gray-300 text-gray-400 text-center font-bold">
             No solution selected in 3D Space
          </div>
        )}
      </div>

      {/* RIGHT PANEL MAP */}
      <div className="w-1/2 h-full relative bg-[#e0e0e0]">
        <MapContainer 
            crs={L.CRS.Simple} 
            bounds={bgBounds}
            zoomSnap={0.5}
            style={{ height: '100%', width: '100%', background: 'transparent' }}>
            
          <ImageOverlay url={bgImage} bounds={bgBounds} opacity={0.65} />
          
          <GeoJSON 
            key={`geojson-${selectedIdx}`} 
            data={geoData} 
            style={styleFeature} 
          />
          <BoundsFitter bounds={bgBounds} geoData={geoData} />
        </MapContainer>
      </div>
    </div>
  );
}

export default App;
