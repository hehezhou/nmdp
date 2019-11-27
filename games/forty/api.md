Send `attack`: `number`

Send `skill`: `{ name:string, ... }`

Send `set_direction`: `number`

Send `set_skills`: `{ passive: number }`

Receive `game_start`: `{ map_height:number, map_width:number, id:string }`

Receive `game_update`: `{ map:{ players:Map<string,Player> }, skills:Map<string,Skill> }`

Receive `request_choice`: `{ type:string }`

Class `Player`: `{ pos:V, speed:V, target_speed:V, facing:V, health:number, target_health:number, attack_state:{ type:0 } | { type:1, time:number, angle:number } | { type:2, time:number }, teamID:string, score:number, effects:{ id:number, time:number, ... }[] }`

Class `Skill`: `{ cooldown:number, total_cooldown:number, is_active:boolean }`

Class `V`: `{ x:number, y:number }`

Receive `player_lose`: `{ deadID:string, killerID:string }`