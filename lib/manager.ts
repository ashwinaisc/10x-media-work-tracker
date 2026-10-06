export type Person={id:string;name:string;email:string;employee_id:string|null;role:'admin'|'manager'|'creator';job:string;manager_id:string|null;active:number;user_id:string|null};
export type GoalType={id:string;name:string;unit:'jobs'|'hours';manager_id:string};
export type Plan={id:string;member_id:string;type_id:string;month:string;target:number;hours_per_job:number|null};
export type Submission={url:string;id:string;plan_id:string;daily_task_id:string|null;title:string;completed:string;quantity:number;status:'review'|'approved'|'changes';feedback:string;version:number;actual_hours:number};
export type ManagerState={me:Person;people:Person[];types:GoalType[];plans:Plan[];submissions:Submission[]};
export function credit(plan:string,items:Submission[]){return Math.round(items.filter(s=>s.plan_id===plan&&s.status!=='changes').reduce((n,s)=>n+s.quantity,0)*100)/100}
