Send `attack`:`number`

Send `set_direction`:`number`

Receive `game_start`:`{ map_height:number, map_width:number, id:string }`

Receive `game_update`:`{ map: { players: Map<string,Player> } }`

Class `Player`:`{ pos:V, speed:V, target_speed:V, health:number, target_health:number, attack_state:{ time:number, angle:number } | null, teamID:string, score:number }`

Class `V`:`{ x:number, y:number }`

Receive `player_lose`: `{ deadID:string, killerID:string }`