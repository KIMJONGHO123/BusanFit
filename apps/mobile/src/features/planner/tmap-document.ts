import type { RouteCoordinate } from '@/api/tmap';

export type TmapData = {
  places: (RouteCoordinate & { name: string; order: number })[];
  segments: { coordinates: RouteCoordinate[]; order: number }[];
};

// This data crosses a JavaScript/HTML boundary; place names are untrusted text.
export function serializeMapData(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export function createTmapDocument(appKey: string): string {
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>html,body,#map{margin:0;width:100%;height:100%;overflow:hidden;background:#eef2f6}
.place-label{display:block;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:white;color:#172334;padding:3px 6px;border-radius:4px;font:bold 11px sans-serif;box-shadow:0 1px 4px #0003}</style>
</head><body><div id="map"></div><script>
(function(){
  var map, overlays = [], data = {places:[],segments:[]};
  var failed = false;
  function send(type){window.ReactNativeWebView.postMessage(JSON.stringify({type:type}));}
  function fail(){if(!failed){failed=true;send('error');}}
  window.addEventListener('error', function(event){
    // Resource errors are not JavaScript errors. Only map tile failures matter here.
    if(event.target && event.target.tagName === 'IMG'){
      var src = event.target.currentSrc || event.target.src || '';
      if(/^https?:/.test(src) && /tile/i.test(src)){fail();}
    } else if(event.message){fail();}
  },true);
  var timer = setTimeout(fail,20000);
  function coordinate(point){return new Tmapv2.LatLng(point.latitude,point.longitude);}
  function escapeText(text){return String(text).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  window.focusSchedule = function(){
    if(!map){return;}
    var points = data.places.slice();
    data.segments.forEach(function(segment){points = points.concat(segment.coordinates);});
    if(!points.length){map.setCenter(new Tmapv2.LatLng(35.1796,129.0756));map.setZoom(12);return;}
    if(points.length === 1){map.setCenter(coordinate(points[0]));map.setZoom(15);return;}
    var minLat=90,maxLat=-90,minLng=180,maxLng=-180;
    points.forEach(function(p){minLat=Math.min(minLat,p.latitude);maxLat=Math.max(maxLat,p.latitude);minLng=Math.min(minLng,p.longitude);maxLng=Math.max(maxLng,p.longitude);});
    var padLat=Math.max((maxLat-minLat)*0.15,0.002);
    var padLng=Math.max((maxLng-minLng)*0.15,0.002);
    map.fitBounds(new Tmapv2.LatLngBounds(new Tmapv2.LatLng(minLat-padLat,minLng-padLng),new Tmapv2.LatLng(maxLat+padLat,maxLng+padLng)));
  };
  window.setSchedule = function(next){
    data = next;
    if(!map){return;}
    try {
      overlays.forEach(function(overlay){overlay.setMap(null);});
      overlays = [];
      var colors=['#1677ff','#e05a24','#7c3aed','#00856a'];
      data.segments.forEach(function(segment){
        if(segment.coordinates.length < 2){return;}
        overlays.push(new Tmapv2.Polyline({path:segment.coordinates.map(coordinate),strokeColor:colors[(segment.order-1)%colors.length],strokeWeight:6,strokeStyle:'solid',map:map}));
      });
      data.places.forEach(function(place){
        var number = place.order === 0 ? '출' : escapeText(place.order);
        var svg='<svg xmlns="http://www.w3.org/2000/svg" width="36" height="42"><path d="M18 40L9 27H27Z" fill="#1677ff"/><circle cx="18" cy="17" r="15" fill="#1677ff" stroke="white" stroke-width="3"/><text x="18" y="22" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="white">'+number+'</text></svg>';
        overlays.push(new Tmapv2.Marker({position:coordinate(place),title:(place.order === 0 ? '출발' : place.order)+'. '+place.name,label:'<span class="place-label">'+escapeText(place.name)+'</span>',icon:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg),iconSize:new Tmapv2.Size(36,42),map:map}));
      });
      window.focusSchedule();
      send('rendered');
    }catch(error){fail();}
  };
  window.tmapLoadFailed=fail;
  window.initializeTmap=function(){
    try{
      if(!window.Tmapv2 || typeof Tmapv2.Map !== 'function'){fail();return;}
      map=new Tmapv2.Map('map',{center:new Tmapv2.LatLng(35.1796,129.0756),width:'100%',height:'100%',zoom:12});
      clearTimeout(timer);
      send('ready');
    }catch(error){fail();}
  };
})();
</script>
<!-- TMAP's bootstrap uses document.write: keep this parser-blocking, never async/dynamic. -->
<script src="https://apis.openapi.sk.com/tmap/jsv2?version=1&amp;appKey=${encodeURIComponent(appKey)}" onerror="window.tmapLoadFailed()"></script>
<script>window.initializeTmap();</script></body></html>`;
}
