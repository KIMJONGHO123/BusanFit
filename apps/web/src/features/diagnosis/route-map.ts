import type { Coordinate, DiagnosisSnapshot, Segment } from './diagnosis'

export type RouteMapData = {
  places: (Coordinate & { name: string; order: number })[]
  segments: { id: string; coordinates: Coordinate[] }[]
}

// Coordinates come only from this diagnosis, never from the search snapshot.
export function routeMapData(segments: Segment[], snapshot: DiagnosisSnapshot): RouteMapData {
  const places = new Map<number, RouteMapData['places'][number]>()
  const routes: RouteMapData['segments'] = []
  segments.forEach((segment, index) => {
    const route = segment.route.value
    if (!route) return
    routes.push({ id: segment.segmentId, coordinates: route.coordinates })
    places.set(index, { ...route.coordinates[0], order: index, name: index === 0 ? snapshot.trip.departure.name : snapshot.stops[index - 1].place.name })
    places.set(index + 1, { ...route.coordinates.at(-1)!, order: index + 1, name: snapshot.stops[index].place.name })
  })
  return { places: [...places.values()].sort((a, b) => a.order - b.order), segments: routes }
}

export function serializeMapData(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}

// TMAP v2 uses document.write, so its bootstrap must run while parsing a document.
// Keep map styling and SDK bootstrap in their own document. Only map data is passed.
export function createRouteMapDocument(appKey: string, data: RouteMapData): string {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box}html,body,#map{margin:0;width:100%;height:100%;background:#f4f4f4;font-family:Arial,"Malgun Gothic",sans-serif}
.place-label{display:block;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:white;color:#101010;padding:5px 8px;border:1px solid #d5d8da;border-radius:6px;font-size:12px;font-weight:600;box-shadow:0 2px 6px #0002}
.place-marker{width:140px;height:70px;display:flex;flex-direction:column;align-items:center;gap:4px}.place-label{max-width:140px}.place-number{display:grid;place-items:center;width:32px;height:32px;flex-shrink:0;border:3px solid white;border-radius:50%;background:#101010;color:white;font-size:14px;box-shadow:0 2px 6px #0003}.marker-tip{width:0;height:0;border:5px solid transparent;border-top-color:#101010;margin-top:-6px}
.controls{position:absolute;top:12px;right:12px;z-index:1000;display:flex;gap:6px}button{min-width:44px;min-height:44px;padding:0 12px;border:1px solid #d5d8da;border-radius:8px;background:white;color:#101010;font:600 12px Arial,"Malgun Gothic",sans-serif;cursor:pointer;box-shadow:0 2px 6px #0001}button:focus-visible{outline:3px solid #1671b7;outline-offset:2px}button:hover{background:#f4f4f4}
</style></head><body><div id="map" aria-hidden="true"></div>
<div class="controls" aria-label="지도 조작"><button id="fit" type="button">전체 경로</button><button id="out" type="button" aria-label="지도 축소">−</button><button id="in" type="button" aria-label="지도 확대">+</button></div>
<script>
(function(){
  var data=${serializeMapData(data)},map,failed=false,busy=false,pendingFit=false,pendingResize=false,rendered=false,tileLoaded=false;
  function send(state){parent.postMessage({channel:'busanfit-route-map',state:state},'*');}
  function fail(){if(!failed){failed=true;clearTimeout(timer);clearInterval(tileCheck);send('error');}}
  function ready(){if(rendered&&tileLoaded&&!failed){clearTimeout(timer);clearInterval(tileCheck);send('ready');}}
  var timer=setTimeout(fail,20000);
  var tileCheck=setInterval(function(){
    var tiles=Array.from(document.querySelectorAll('#map img')).filter(function(img){var r=img.getBoundingClientRect();return img.src.includes('/tms/')&&r.right>0&&r.left<innerWidth&&r.bottom>0&&r.top<innerHeight;});
    tileLoaded=tiles.length>0&&tiles.every(function(img){return img.complete&&img.naturalWidth>0;});ready();
  },200);
  window.addEventListener('error',function(event){
    if(event.target&&event.target.tagName==='IMG'){
      if(/tile/i.test(event.target.currentSrc||event.target.src||'')){fail();}
    }else if(event.message){fail();}
  },true);
  function point(p){return new Tmapv2.LatLng(p.latitude,p.longitude);}
  function escapeText(text){return String(text).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function fit(){
    if(busy){pendingFit=true;return;}
    var points=[];data.segments.forEach(function(s){points=points.concat(s.coordinates);});
    var minLat=90,maxLat=-90,minLon=180,maxLon=-180;
    points.forEach(function(p){minLat=Math.min(minLat,p.latitude);maxLat=Math.max(maxLat,p.latitude);minLon=Math.min(minLon,p.longitude);maxLon=Math.max(maxLon,p.longitude);});
    var padLat=Math.max((maxLat-minLat)*0.2,0.002),padLon=Math.max((maxLon-minLon)*0.2,0.002);
    map.fitBounds(new Tmapv2.LatLngBounds(new Tmapv2.LatLng(minLat-padLat,minLon-padLon),new Tmapv2.LatLng(maxLat+padLat,maxLon+padLon)),{top:110,right:70,bottom:35,left:70});
  }
  window.tmapLoadFailed=fail;
  window.initializeTmap=function(){try{
    if(!window.Tmapv2||typeof Tmapv2.Map!=='function'){fail();return;}
    map=new Tmapv2.Map('map',{center:point(data.places[0]),width:'100%',height:'100%',zoom:12,zoomControl:false,httpsMode:true,scrollwheel:false});
    data.segments.forEach(function(s){new Tmapv2.Polyline({path:s.coordinates.map(point),strokeColor:'#2463b5',strokeWeight:6,strokeStyle:'solid',map:map});});
    data.places.forEach(function(p){
      var number=p.order===0?'출':p.order;
      var html='<div class="place-marker"><span class="place-label">'+escapeText(p.name)+'</span><span class="place-number">'+number+'</span><span class="marker-tip"></span></div>';
      new Tmapv2.Marker({position:point(p),title:escapeText((p.order===0?'출발':p.order)+'. '+p.name),iconHTML:html,iconSize:new Tmapv2.Size(140,70),map:map});
    });
    document.getElementById('fit').onclick=fit;
    function zoom(delta){var next=Math.max(7,Math.min(19,map.getZoom()+delta));if(busy||next===map.getZoom()){return;}busy=true;map.setZoom(next);}
    map.addListener('zoom_changed',function(){busy=false;if(pendingResize){pendingResize=false;resize();}else if(pendingFit){pendingFit=false;fit();}});
    document.getElementById('in').onclick=function(){zoom(1);};
    document.getElementById('out').onclick=function(){zoom(-1);};
    var host=document.getElementById('map');
    function resize(){if(busy){pendingResize=true;return;}pendingFit=false;map.resize(host.clientWidth,host.clientHeight);fit();}
    new ResizeObserver(resize).observe(host);
    fit();rendered=true;ready();
  }catch(error){fail();}};
})();
</script><script src="https://apis.openapi.sk.com/tmap/jsv2?version=1&amp;appKey=${encodeURIComponent(appKey)}" onerror="window.tmapLoadFailed()"></script>
<script>window.initializeTmap();</script></body></html>`
}
