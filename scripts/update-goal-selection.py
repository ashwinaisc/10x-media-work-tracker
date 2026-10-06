from pathlib import Path


path = Path("app/manager-workspace.tsx")
source = path.read_text(encoding="utf-8")
replacements = [
    (
        "onClick={()=>{setSearch('');setTab(n.id)}}",
        "onClick={()=>{setSearch('');setSelectedGoalMember('');setTab(n.id)}}",
    ),
    (
        "onGoals={()=>{setSearch('');setTab('goals')}}",
        "onGoals={()=>{setSearch('');setSelectedGoalMember('');setTab('goals')}}",
    ),
    (
        "onClick={()=>{setSearch(p.name);setTab('goals')}}",
        "onClick={()=>{setSearch(p.name);setSelectedGoalMember(p.id);setTab('goals')}}",
    ),
    (
        "onClick={()=>{setSearch('');setTab('goals')}}",
        "onClick={()=>{setSearch('');setSelectedGoalMember('');setTab('goals')}}",
    ),
    (
        'aria-label="Search goal member" placeholder="Search team member" value={search} onChange={e=>setSearch(e.target.value)}',
        'aria-label="Search goal member" placeholder="Search team member" value={search} onChange={e=>{setSearch(e.target.value);setSelectedGoalMember(\'\')}}',
    ),
    (
        "plans.filter(p=>personName(p.member_id).toLowerCase().includes(search.toLowerCase()))",
        "plans.filter(p=>selectedGoalMember?p.member_id===selectedGoalMember:personName(p.member_id).toLowerCase().includes(search.toLowerCase()))",
    ),
]

for old, new in replacements:
    if old not in source:
        raise SystemExit(f"Missing replacement: {old}")
    source = source.replace(old, new)

path.write_text(source, encoding="utf-8")
