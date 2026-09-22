// Team_Goals.pptx, slides 4–7 and 9–21. Unresolved labels remain separate.
export const kinds={reels:'Reels',carousel:'Carousel',video_carousel:'Video Carousel',post:'Post',story:'Story',egc:'EGC',hc:'HC',ads:'Ads (unspecified)',vsl_ads:'VSL Ads',mhs_ads:'MHS Ads',longform:'Longform',shoot:'Shoot',schedule:'Schedule',service:'Service',ai_hours:'AI Hours',longer:'longer (unclassified)',ffc:'FFC (unclassified)',new_creative:'New Creative (unclassified)',uiux:'UI/UX design',graphic:'Graphic design (general)',video:'Video editing (general)'};
export const goalGroups={content:'Content',ads:'Ads',production:'Production & operations',hours:'AI Hours',unclassified:'Unclassified',other:'Other design work'};
export type GoalGroup=keyof typeof goalGroups;
export function goalGroup(kind:string):GoalGroup {if(['reels','carousel','video_carousel','post','story','egc','hc'].includes(kind))return 'content';if(['ads','vsl_ads','mhs_ads'].includes(kind))return 'ads';if(['longform','shoot','schedule','service'].includes(kind))return 'production';if(kind==='ai_hours')return 'hours';if(['longer','ffc','new_creative'].includes(kind))return 'unclassified';return 'other'}
export function goalStyle(kind:string){return ['reels','video_carousel','video','longform','ads','vsl_ads','mhs_ads'].includes(kind)?'video':kind==='uiux'?'uiux':'graphic'}
export function goalTotal(tasks:Task[]){return Math.round(tasks.reduce((sum,t)=>sum+(t.kind==='ai_hours'?(t.completed_hours??0):1),0)*100)/100}
export const roles={admin:'Admin',manager:'Manager',creator:'Creator',scheduler:'Scheduling team'};
export const statuses={planned:'Planned',progress:'In progress',review:'In review',changes:'Changes requested',approved:'Ready to schedule',scheduled:'Scheduled'};
export type Kind=keyof typeof kinds; export type Role=keyof typeof roles; export type Status=keyof typeof statuses;
export type Member={id:string;user_id:string|null;email:string;name:string;role:Role};
export type Channel={id:string;name:string;folder:string};
export type Task={id:string;title:string;channel_id:string;kind:Kind;due:string;assignee:string;status:Status;drive_url:string;completed:string;notes:string;feedback:string;scheduled:string;version:number;completed_hours:number};
export type Target={id:string;channel_id:string;month:string;kind:Kind;quantity:number};
export type State={me:Member;channels:Channel[];members:Member[];tasks:Task[];targets:Target[]};
export function driveId(url:string){try{const u=new URL(url);if(u.hostname!=='drive.google.com')return null;return u.pathname.match(/\/file\/d\/([\w-]+)/)?.[1]??(u.pathname==='/open'?u.searchParams.get('id'):null)}catch{return null}}
export function localDate(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
