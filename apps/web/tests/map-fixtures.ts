import type { Page } from '@playwright/test'

// Test-only SDK double. No product code substitutes map or routing data.
export async function stubMap(page: Page) {
  await page.context().route(/apis\.openapi\.sk\.com\/tmap\/jsv2/, (route) => route.fulfill({ contentType: 'application/javascript', body: `
    window.mapCalls={paths:[],markers:[],bounds:[],zoom:12,resizes:0};
    window.Tmapv2={
      LatLng:function(latitude,longitude){this.latitude=latitude;this.longitude=longitude;},
      LatLngBounds:function(sw,ne){this.sw=sw;this.ne=ne;},
      Size:function(){},
      Map:function(){
        var changed=function(){};
        this.addListener=function(event,callback){if(event==='zoom_changed')changed=callback;};
        this.fitBounds=function(b){window.mapCalls.bounds.push(b);};
        this.setZoom=function(z){window.mapCalls.zoom=z;queueMicrotask(changed);};
        this.getZoom=function(){return window.mapCalls.zoom;};
        this.resize=function(){window.mapCalls.resizes++;};
        var tile=document.createElement('img');tile.src='https://map-fixture.test/tms/tile.png';tile.alt='';tile.style.cssText='position:absolute;top:0;left:0;width:1px;height:1px';document.getElementById('map').appendChild(tile);
      },
      Polyline:function(options){window.mapCalls.paths.push(options.path);},
      Marker:function(options){
        window.mapCalls.markers.push({position:options.position,title:options.title});
        var label=document.createElement('div');label.innerHTML=options.iconHTML;document.getElementById('map').appendChild(label);
      }
    };` }))
  await page.context().route('https://map-fixture.test/tms/tile.png', (route) => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jNxoAAAAASUVORK5CYII=', 'base64') }))
}
