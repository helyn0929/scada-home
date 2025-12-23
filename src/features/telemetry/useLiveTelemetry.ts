import{useState,useEffect, use}from"react";
import{TelemetryData}from"./types";

export function useLiveTelemetry(url:string){    //url:string 
    const[data,setData]=useState<TelemetryData|null>(null);
    
    useEffect(()=>{
        const useMockData = import.meta.env.VITE_MOCK === '1';
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const intervalMs = parseInt(import.meta.env.VITE_TELEMETRY_POLL_INTERVAL_MS || '1000', 10);
        
        let timer: number | null = null;
        let ignore = false;

        //simulated data
        function generateMock():TelemetryData{
            return{
                power_kw: 500 + Math.random()*1000,     //add new data here
                energy_kwh:Math.random()*500,
                discharge_cms: Math.random()*50,
                capacity_factor:Math.random()*100,
            };
        }

        async function fetchData(){
            if(useMockData){
                setData(generateMock());
                return;
            }
            try{
                const res = await fetch(apiUrl);
                if(!res.ok) throw new Error('Request failed');
                const json=await res.json();
                if(!ignore){
                    setData({
                        power_kw: json.power_kw,                        //add new data here
                        energy_kwh: json.energy_kwh,
                        discharge_cms: json.discharge_cms,  
                        capacity_factor: json.capacity_factor,
                });
                }
            }catch(err){
                console.error('Error fetching telemetry data:',err);
            }
        }

        // immediate fetch
        fetchData();
        //set interval for periodic fetch
        timer=window.setInterval(fetchData,intervalMs);

        return()=>{
            ignore=true;
            if(timer) window.clearInterval(timer);  
        };
    },[]); 
    
    return data;    

}

