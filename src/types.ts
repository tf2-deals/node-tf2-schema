export interface SchemaAttribute {
  name: string;
  defindex: number;
  attribute_class: string;
  description_string?: string;
  description_format?: string;
  effect_type: string;
  hidden: boolean;
  stored_as_integer: boolean;
}

export interface Attribute {
  name: string;
  class: string;
  value: number;
}

export interface ItemSet {
  item_set: string;
  name: string;
  items: string[];
  attributes?: Attribute[];
}

export interface SchemaAttributeControlledAttachedParticle {
  system: string;
  id: number;
  attach_to_rootbone: boolean;
  name: string;
}

export interface SchemaStrangeParts {
  type: number;
  type_name: string;
  level_data: string;
}

export interface SchemaItem {
  name: string;
  defindex: number;
  item_class: string;
  item_type_name: string;
  item_name: string;
  item_description: string;
  proper_name: boolean;
  item_slot: string;
  model_player?: string | null;
  item_quality: number;
  image_inventory: string;
  min_ilevel: number;
  max_ilevel: number;
  image_url: string | null;
  image_url_large: string | null;
  drop_type?: string;
  item_set?: string;
  holiday_restriction?: string;
  craft_class?: string;
  craft_material_type?: string;
  capabilities?: SchemaItemCapabilities;
  styles?: SchemaItemStyle[];
  tool?: SchemaItemTools;
  used_by_classes: string[];
  attributes: Attribute[];
}

export interface SchemaItemStyle {
  name: string;
}

export interface SchemaItemTools {
  type: string;
  use_string?: string;
  restriction?: string;
  usage_capabilities?: SchemaItemUsageCapabilities;
}

export interface SchemaItemUsageCapabilities {
  decodeable?: boolean;
  paintable?: boolean;
  can_customize_texture?: boolean;
  can_gift_wrap?: boolean;
  paintable_team_colors?: boolean;
  strange_parts?: boolean;
  nameable?: boolean;
  can_card_upgrade?: boolean;
  can_consume?: boolean;
  can_killstreakify?: boolean;
  can_spell_page?: boolean;
  can_strangify?: boolean;
  can_unusualify?: boolean;
  duck_upgradable?: boolean;
}

export interface SchemaItemCapabilities {
  decodable?: boolean;
  paintable?: boolean;
  nameable?: boolean;
  usable_gc?: boolean;
  usable?: boolean;
  can_craft_if_purchased?: boolean;
  can_gift_wrap?: boolean;
  usable_out_of_game?: boolean;
  can_craft_count?: boolean;
  can_craft_mark?: boolean;
  can_be_restored?: boolean;
  strange_parts?: boolean;
  can_card_upgrade?: boolean;
  can_strangify?: boolean;
  can_killstreakify?: boolean;
  can_consume?: boolean;
}

export interface Item {
  defindex: number;
  quality: number;
  craftable?: boolean;
  tradable?: boolean;
  killstreak?: number;
  australium?: boolean;
  effect?: number;
  festive?: boolean;
  paintkit?: number;
  wear?: number;
  quality2?: number;
  target?: number;
  craftnumber?: number;
  crateseries?: number;
  output?: number;
  outputQuality?: number;
  paint?: number;
}

export interface Qualities {
  [qualityName: string]: number;
}

export interface Effect {
  name: string;
  id: number;
}

export interface ParticleEffects {
  [name: string]: number;
}

export interface Paintkits {
  [name: string]: number;
}

export interface Paints {
  [name: string]: number;
}

export interface StrangeParts {
  [name: string]: string;
}

export interface CrateSeriesList {
  [defindex: string]: number;
}

export type CharacterClasses =
  | 'Scout'
  | 'Soldier'
  | 'Pyro'
  | 'Demoman'
  | 'Heavy'
  | 'Engineer'
  | 'Medic'
  | 'Sniper'
  | 'Spy';

export interface RawSchema {
  schema: Overview & {
    items: SchemaItem[];
    paintkits: Record<string, string>;
  };
  items_game: ItemsGame;
}

export interface Overview {
  items_game_url: string;
  qualities: Qualities;
  qualityNames: Record<string, string>;
  originNames?: { origin: number; name: string }[];
  attributes: SchemaAttribute[];
  item_sets?: ItemSet[];
  attribute_controlled_attached_particles: SchemaAttributeControlledAttachedParticle[];
  item_levels?: {
    name: string;
    levels: { level: number; required_scope: number; name: string }[];
  }[];
  kill_eater_score_types: SchemaStrangeParts[];
  string_lookups?: {
    table_name: string;
    strings: { index: number; string: string }[];
  }[];
}

export interface ItemsGame {
  game_info?: Record<string, string>;
  qualities?: Qualities;
  colors?: { [key: string]: { color_name: string } };
  rarities?: {
    [key: string]: {
      value: string;
      loc_key: string;
      loc_key_weapon: string;
      color: string;
      drop_sound: string;
    };
  };
  equip_regions_list?: Record<string, string> & {
    shared: Record<string, string>;
  };
  equip_conflicts?: { [key: string]: Record<string, string> };
  quest_objective_conditions?: {
    [key: string]: {
      name: string;
      condition_logic: {
        [key: string]: {
          [key: string]: {
            type: string;
            player_key: string;
            get_player: string;
            is_owner: '1' | '0';
          };
        } & { type: string };
      } & { type: string; event_name: string; score_key_name: string };
    };
  };
  item_series_types?: {
    [key: string]: {
      value: string;
      loc_key: string;
      ui: string;
    };
  };
  item_collections?: {
    [key: string]: {
      name: string;
      description: string;
      is_reference_collection?: '1';
      items: { [key: string]: Record<string, string> } | Record<string, string>;
    };
  };
  operations?: Record<string, Record<string, string>>;
  prefabs?: Record<string, any>;
  items: Record<string, Record<string, any>>;
  attributes?: Record<string, Record<string, string>>;
  item_criteria_templates?: Record<string, Record<string, string>>;
  random_attribute_templates?: Record<string, Record<string, any>>;
  lootlist_job_template_definitions?: Record<string, Record<string, any>>;
  item_sets?: Record<string, Record<string, any>>;
  client_loot_lists?: Record<string, Record<string, any>>;
  revolving_loot_lists?: Record<string, string>;
  recipes?: Record<string, Record<string, any>>;
  achievement_rewards?: Record<string, Record<string, any>>;
  attribute_controlled_attached_particles?: {
    other_particles: Record<
      string,
      { system: string; attachment?: string; draw_in_viewmodel?: '1' }
    >;
    cosmetic_unusual_effects: Record<
      string,
      { system: string; attachment?: string; attach_to_rootbone?: '1' }
    >;
    weapon_unusual_effects: Record<
      string,
      {
        system: string;
        draw_in_viewmodel?: '1';
        use_suffix_name?: '1';
        attachment?: string;
        control_point_1: string;
        control_point_2: string;
        control_point_3: string;
        control_point_4: string;
        control_point_5: string;
      }
    >;
    killstreak_eyeglows: Record<string, Record<string, string>>;
    taunt_unusual_effects: Record<
      string,
      {
        system: string;
        refire_time?: string;
      }
    >;
  };
  armory_data?: Record<string, Record<string, string>>;
  item_levels?: Record<string, Record<string, string>>;
  kill_eater_score_types?: Record<string, Record<string, string>>;
  mvm_maps?: Record<string, Record<string, any>>;
  mvm_tours?: Record<
    string,
    {
      tour_name: string;
      badge_item_def: string;
      mission_complete_loot_list: string;
      tour_complete_loot_list: string;
      difficulty: string;
      loot_image: string;
      missions: Record<string, string>;
    }
  >;
  matchmaking_categories?: Record<string, Record<string, any>>;
  maps?: Record<string, Record<string, any>>;
  master_maps_list?: Record<string, Record<string, any>>;
  steam_packages?: Record<string, Record<string, string>>;
  string_lookups?: Record<string, Record<string, string>>;
  community_market_item_remaps?: Record<string, Record<string, string>>;
  war_definitions?: Record<string, Record<string, any>>;
}

export interface PricesResponse {
  success: boolean;
  message?: string;
}

export interface GetSchemaResponse extends PricesResponse {
  version: string;
  time: number;
  raw: any;
}

export interface SchemaOptions {
  version: string;
  raw: RawSchema;
  time: number;
}
