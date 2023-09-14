import { EventEmitter } from 'events';
import semver from 'semver';

import { Schema } from './schema';

interface Options {
  /**
   * Can be found here: https://steamcommunity.com/dev/apikey
   *
   * API keys can be used to control your account. Please don't share with
   * other people.
   */
  apiKey: string;
  /** @default {milliseconds} 1 day */
  updateTime?: number;
  lite?: boolean;
}

const version = '4.2.14';

export class TF2Schema extends EventEmitter {
  public apiKey: string;
  public updateTime: number;
  public lite: boolean;

  public ready: boolean;
  public schema: Schema | null;

  private updateTimeout: NodeJS.Timeout | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(options: Options) {
    super();

    if (!options.apiKey) throw new Error('Missing API key');

    this.apiKey = options.apiKey;
    this.updateTime = options.updateTime || 24 * 60 * 60 * 1000;
    this.lite = options.lite || false;

    this.ready = false;
    this.schema = null;
  }

  /**
   * @param {String} apiKey Steam API key
   */
  public setAPIKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Initializes the class
   */
  public async init() {
    if (this.ready) return;

    if (!this.schema && this.updateWait() === 0) await this.getSchema();

    this.startUpdater();
    this.ready = true;
    this.emit('ready');
  }

  /**
   * Sets the schema using known data. If the schema data does not contain a
   * version, or the version does not satisfy our version, then the schema
   * will be ignored
   */
  setSchema(data: SchemaOptions, fromUpdate: boolean) {
    if (
      (!data.version && !fromUpdate) ||
      semver.major(data.version) > semver.major(version)
    )
      return;

    if (this.schema) {
      this.schema.raw = data.raw;
      this.schema.time = data.time || new Date().getTime();
      this.schema.setPropertiesData();
    } else {
      this.schema = new Schema(data);
    }

    if (fromUpdate) this.emit('schema', this.schema);
  }

  /**
   * Gets the schema from the TF2 API
   */
  public async getSchema() {
    const [overview, items, paintkits, items_game] = await Promise.all([
      Schema.getOverview(this.apiKey),
      Schema.getItems(this.apiKey),
      Schema.getPaintKits(),
      Schema.getItemsGame(),
    ]);

    const raw = {
      schema: Object.assign(overview, { items, paintkits }),
      items_game,
    };

    // delete unnecessary things
    if (this.lite) {
      // schema
      // raw.schema.qualities;                                  // used
      // raw.schema.qualityNames;                               // used
      delete raw.schema.originNames;
      // raw.schema.attributes;                                 // used
      delete raw.schema.item_sets;
      // raw.schema.attribute_controlled_attached_particles;    // used
      delete raw.schema.item_levels;
      // raw.schema.kill_eater_score_types;                     // used
      delete raw.schema.string_lookups; // Might be needed for Spells
      // raw.schema.items                                       // strictly necessary
      // raw.schema.paintkits                                   // strictly necessary

      // items_game
      delete raw.items_game.game_info;
      delete raw.items_game.qualities; // duplicate of raw.schema.qualities
      delete raw.items_game.colors;
      delete raw.items_game.rarities;
      delete raw.items_game.equip_regions_list;
      delete raw.items_game.equip_conflicts;
      delete raw.items_game.quest_objective_conditions;
      delete raw.items_game.item_series_types;
      delete raw.items_game.item_collections;
      delete raw.items_game.operations;
      // raw.items_game.items;                                  // used
      delete raw.items_game.prefabs;
      delete raw.items_game.attributes; // duplicate of raw.schema.attributes
      delete raw.items_game.item_criteria_templates;
      delete raw.items_game.random_attribute_templates;
      delete raw.items_game.lootlist_job_template_definitions;
      delete raw.items_game.item_sets;
      delete raw.items_game.client_loot_lists;
      delete raw.items_game.revolving_loot_lists;
      delete raw.items_game.recipes;
      delete raw.items_game.achievement_rewards;
      delete raw.items_game.attribute_controlled_attached_particles; // duplicate and not used
      delete raw.items_game.armory_data;
      delete raw.items_game.item_levels;
      delete raw.items_game.kill_eater_score_types; // duplicate of raw.schema.kill_eater_score_types
      delete raw.items_game.mvm_maps;
      delete raw.items_game.mvm_tours;
      delete raw.items_game.matchmaking_categories;
      delete raw.items_game.maps;
      delete raw.items_game.master_maps_list;
      delete raw.items_game.steam_packages;
      // raw.items_game.string_lookups                          // might use later for spells
      delete raw.items_game.community_market_item_remaps;
      delete raw.items_game.war_definitions;
    }

    this.setSchema({ version, raw, time: new Date().getTime() }, true);
    return this.schema;
  }

  /**
   * Starts schema updater
   */
  private startUpdater() {
    if (this.updateTime === -1) return;

    if (this.updateTimeout) clearTimeout(this.updateTimeout);
    if (this.updateInterval) clearInterval(this.updateInterval);

    this.updateTimeout = setTimeout(async () => {
      try {
        await this.getSchema();
      } catch (err) {
        this.emit('failed', err);
      }

      this.updateInterval = setInterval(
        TF2Schema.prototype.getSchema.bind(this),
        this.updateTime,
      );
    }, this.updateWait());
  }

  private updateWait() {
    if (this.updateTime === -1) return -1;
    if (!this.schema) throw new Error('Schema not set');

    const wait = this.schema.time - new Date().getTime() + this.updateTime;

    return wait < 0 ? 0 : wait;
  }
}
