import SKU from '@tf2deals/tf2-sku';
import axios from 'axios';
import vdf from 'vdf-parser';

import {
  exclusiveGenuine,
  exclusiveGenuineReversed,
  flameThrowerSkins,
  grenadeLauncherSkins,
  knifeSkins,
  medicgunSkins,
  minigunSkins,
  munitionCrate,
  pistolSkins,
  retiredKeys,
  retiredKeysNames,
  revolverSkins,
  rocketLauncherSkins,
  scattergunSkins,
  shotgunSkins,
  smgSkins,
  sniperRifleSkins,
  stickybombSkins,
  wrenchSkins,
} from './resources';
import { SteamRequest } from './steam-request';
import {
  CharacterClasses,
  CrateSeriesList,
  Effect,
  GetSchemaResponse,
  Item,
  ItemsGame,
  Overview,
  Paintkits,
  Paints,
  ParticleEffects,
  Qualities,
  RawSchema,
  SchemaAttribute,
  SchemaItem,
  SchemaOptions,
  StrangeParts,
} from './types';

const language = 'English';

function log(...args: any[]) {
  if (process.env.DEBUG_SCHEMA === 'true') console.debug(...args);
}

export class Schema {
  public version: string;
  public raw: RawSchema;
  public time: number;

  public crateSeriesList: CrateSeriesList | undefined;
  public qualities: Qualities | undefined;
  public effects: ParticleEffects | undefined;
  public paintkits: Paintkits | undefined;
  public paints: Paints | undefined;

  /**
   * Initializes the Schema class
   * @param {Object} data
   * @param {Object} [data.raw] Raw schema
   * @param {Number} [data.time] Time when the schema was made
   */
  constructor(data: SchemaOptions) {
    this.version = data.version;
    this.raw = data.raw;
    this.time = data.time || new Date().getTime();

    this.setPropertiesData();
  }

  setPropertiesData() {
    // Probably set these as Static later
    this.crateSeriesList = this.getCrateSeriesList();
    this.qualities = this.getQualities();
    this.effects = this.getParticleEffects();
    this.paintkits = this.getPaintKits();
    this.paints = this.getPaints();
  }

  getItemByItemNameWithThe(name: string): SchemaItem | null {
    name = name.toLowerCase();

    if (name.includes('the ')) {
      name
        .split('the ')
        .forEach(() => (name = name.replace('the ', '').trim()));
    }

    for (const item of this.raw.schema.items) {
      let itemName = item.item_name.toLowerCase();

      if (itemName.includes('the ')) {
        itemName
          .split('the ')
          .forEach(() => (itemName = itemName.replace('the ', '').trim()));
      }

      if (name === itemName) {
        // skip and let it find Name Tag with defindex 5020
        if (item.item_name === 'Name Tag' && item.defindex === 2093) continue;

        // skip if Stock Quality
        if (item.item_quality === 0) continue;

        return item;
      }
    }

    return null;
  }

  /**
   * Gets sku
   */
  getSkuFromName(name: string): string | null {
    const item = this.getItemObjectFromName(name);
    if (!item) return null;
    return SKU.fromObject(item);
  }

  /**
   * Gets sku item object
   */
  getItemObjectFromName(name: string): Item | null {
    name = name.toLowerCase();

    const item: Partial<Item> = {
      defindex: undefined,
      quality: undefined,
      craftable: true,
    };

    if (
      name.includes('strange part:') ||
      name.includes('strange cosmetic part:') ||
      name.includes('strange filter:') ||
      name.includes('strange count transfer tool') ||
      name.includes('strange bacon grease')
    ) {
      const schemaItem = this.getItemByItemName(name);

      if (!schemaItem) {
        log('returned L359', { name, item });
        return null;
      }

      item.defindex = schemaItem.defindex;
      item.quality = item.quality || schemaItem.item_quality; //default quality

      log('returned L367', { name, item });
      return item as Item;
    }

    const wears = {
      '(factory new)': 1,
      '(minimal wear)': 2,
      '(field-tested)': 3,
      '(well-worn)': 4,
      '(battle scarred)': 5,
    } as const;

    for (const wear in wears) {
      if (name.includes(wear)) {
        log('Wear - before', { name, item });

        name = name.replace(wear, '').trim();
        item.wear = wears[wear as keyof typeof wears];

        log('Wear - after', { name, item });
        break;
      }
    }

    // So far we only have "Strange" as elevated quality, so ignore other qualities.
    let isExplicitElevatedStrange = false;

    if (name.includes('strange(e)')) {
      log('"Strange(e)" - before', { name, item });

      item.quality2 = 11;
      isExplicitElevatedStrange = true;
      name = name.replace('strange(e)', '').trim();

      log('"Strange(e)" - after', { name, item });
    }

    if (name.includes('strange')) {
      log('"Strange" - before', { name, item });

      item.quality = 11;
      name = name.replace('strange', '').trim();

      log('"Strange" - after', { name, item });
    }

    name = name.replace('uncraftable', 'non-craftable');

    if (name.includes('non-craftable')) {
      log('"Non-Craftable" - before', { name, item });

      name = name.replace('non-craftable', '').trim();
      item.craftable = false;

      log('"Non-Craftable" - after', { name, item });
    }

    name = name
      .replace('untradeable', 'non-tradable')
      .replace('untradable', 'non-tradable')
      .replace('non-tradeable', 'non-tradable');

    if (name.includes('non-tradable')) {
      log('"Non-Tradable" - before', { name, item });

      name = name.replace('non-tradable', '').trim();
      item.tradable = false;

      log('"Non-Tradable" - after', { name, item });
    }

    if (name.includes('unusualifier')) {
      name = name.replace('unusual ', '').replace(' unusualifier', '').trim();
      item.defindex = 9258;
      item.quality = 5;

      const schemaItem = this.getItemByItemName(name); // Taunt Name

      if (schemaItem) item.target = schemaItem.defindex;

      log('returned L459', { name, item });
      return item as Item;
    }

    const killstreaks = {
      'professional killstreak': 3,
      'specialized killstreak': 2,
      killstreak: 1,
    };

    for (const killstreak in killstreaks) {
      if (name.includes(killstreak)) {
        log('"Killstreak" - before', { name, item });

        name = name.replace(killstreak + ' ', '').trim();
        item.killstreak = killstreaks[killstreak as keyof typeof killstreaks];

        log('"Killstreak" - after', { name, item });
        break;
      }
    }

    if (name.includes('australium') && !name.includes('australium gold')) {
      log('"Australium" - before', { name, item });

      name = name.replace('australium', '').trim();
      item.australium = true;

      log('"Australium" - after', { name, item });
    }

    if (name.includes('festivized') && !name.includes('festivized formation')) {
      log('"Festivized" - before', { name, item });

      name = name.replace('festivized', '').trim();
      item.festive = true;

      log('"Festivized" - after', { name, item });
    }

    //Try to find quality name in name
    const exception = [
      'haunted ghosts',
      'haunted phantasm jr',
      'haunted phantasm',
      'haunted metal scrap',
      'haunted hat',
      'unusual cap',
      'vintage tyrolean',
      'vintage merryweather',
      'haunted kraken',
      'haunted forever!',
    ];

    let qualitySearch = name;

    for (const ex of exception) {
      if (name.includes(ex)) {
        qualitySearch = name.replace(ex, '').trim();
        break;
      }
    }

    // Get all qualities
    const schema = this.raw.schema;

    if (!exception.includes(qualitySearch)) {
      // Make sure qualitySearch does not includes in the exception list.
      // example: "Haunted Ghosts Vintage Tyrolean" - will skip this.

      for (const qualityC in this.qualities) {
        const quality = qualityC.toLowerCase();

        if (
          quality === "collector's" &&
          qualitySearch.includes("collector's") &&
          qualitySearch.includes('chemistry set')
        )
          continue;

        if (
          quality === 'community' &&
          qualitySearch.startsWith('community sparkle')
        )
          continue;

        if (qualitySearch.startsWith(quality)) {
          log('"Quality" - before', { name, item });

          name = name.replace(quality, '').trim();
          item.quality2 = item.quality2 ?? item.quality;
          item.quality = this.qualities[qualityC];

          log('"Quality" - after', { name, item });
          break;
        }
      }
    }

    //Check for effects
    const excludeAtomic = ['bonk! atomic punch', 'atomic accolade'].some((ex) =>
      name.includes(ex),
    );

    for (const effectC in this.effects) {
      const effect = effectC.toLowerCase();

      if (effect === 'stardust' && name.includes('starduster')) {
        const sub = name.replace('stardust', '').trim();
        if (!sub.includes('starduster')) continue;
      }

      if (
        effect === 'showstopper' &&
        !name.includes('taunt: ') &&
        !name.includes('shred alert')
      )
        continue;

      if (
        effect === 'smoking' &&
        (name === 'smoking jacket' ||
          name.includes('smoking skid lid') ||
          name === 'the smoking skid lid') &&
        !name.includes('smoking smoking')
      )
        continue;

      if (
        effect === 'haunted ghosts' &&
        name.includes('haunted ghosts') &&
        item.wear
      )
        continue;

      if (
        effect === 'spellbound' &&
        (name.includes('taunt:') || name.includes('shred alert'))
      )
        continue;

      if (effect === 'haunted' && name.includes('haunted kraken')) continue;
      if (effect === 'frostbite' && name.includes('frostbite bonnet')) continue;
      if (effect === 'accursed' && name.includes('accursed apparition'))
        continue;
      if (effect === 'atomic' && (name.includes('subatomic') || excludeAtomic))
        continue;

      if (
        effect === 'hot' &&
        (!item.wear ||
          (!name.includes('hot ') &&
            !name.startsWith('hot ') &&
            name.includes('shotgun')) ||
          name.includes('shot ') ||
          name.includes('plaid potshotter'))
      )
        continue;

      if (effect === 'cool' && !item.wear) continue;

      if (name.includes(effect)) {
        log('"Effect" - before', { name, item });

        name = name.replace(effect, '').trim();
        item.effect = this.effects[effectC];

        if (item.effect === 4 && item.quality == null) {
          item.quality = 5;
        } else if (item.quality !== 5) {
          item.quality2 = item.quality2 || item.quality;
          item.quality = 5;
        }

        log('"Effect" - after', { name, item });

        break;
      }
    }

    if (item.wear) {
      for (const paintkitC in this.paintkits) {
        const paintkit = paintkitC.toLowerCase();
        if (name.includes('mk.ii') && !paintkit.includes('mk.ii')) continue;
        if (name.includes('(green)') && !paintkit.includes('(green)')) continue;
        if (name.includes('chilly') && !paintkit.includes('chilly')) continue;

        if (name.includes(paintkit)) {
          log('"Paintkit" - before', { name, item });

          name = name.replace(paintkit, '').replace(' | ', '').trim();
          item.paintkit = this.paintkits[paintkitC];

          if (item.effect != null) {
            if (item.quality === 5 && item.quality2 === 11) {
              if (!isExplicitElevatedStrange) {
                item.quality = 11;
                item.quality2 = undefined;
              } else {
                item.quality = 15;
              }
            } else if (item.quality === 5 && item.quality2 == null) {
              item.quality = 15;
            }
          }

          if (!item.quality) item.quality = 15;

          log('"Paintkit" - after', { name, item });
          break;
        }
      }

      if (!name.includes('War Paint')) {
        const oldDefindex = item.defindex;

        // REVIEW: This is a mess, but it works.
        item.defindex =
          name.includes('pistol') && pistolSkins.has(item.paintkit)
            ? pistolSkins.get(item.paintkit)
            : name.includes('rocket launcher') &&
              rocketLauncherSkins.has(item.paintkit)
            ? rocketLauncherSkins.get(item.paintkit)
            : name.includes('medi gun') && medicgunSkins.has(item.paintkit)
            ? medicgunSkins.get(item.paintkit)
            : name.includes('revolver') && revolverSkins.has(item.paintkit)
            ? revolverSkins.get(item.paintkit)
            : name.includes('stickybomb launcher') &&
              stickybombSkins.has(item.paintkit)
            ? stickybombSkins.get(item.paintkit)
            : name.includes('sniper rifle') &&
              sniperRifleSkins.has(item.paintkit)
            ? sniperRifleSkins.get(item.paintkit)
            : name.includes('flame thrower') &&
              flameThrowerSkins.has(item.paintkit)
            ? flameThrowerSkins.get(item.paintkit)
            : name.includes('minigun') && minigunSkins.has(item.paintkit)
            ? minigunSkins.get(item.paintkit)
            : name.includes('scattergun') && scattergunSkins.has(item.paintkit)
            ? scattergunSkins.get(item.paintkit)
            : name.includes('shotgun') && shotgunSkins.has(item.paintkit)
            ? shotgunSkins.get(item.paintkit)
            : name.includes('smg') && smgSkins.has(item.paintkit)
            ? smgSkins.get(item.paintkit)
            : name.includes('grenade launcher') &&
              grenadeLauncherSkins.has(item.paintkit)
            ? grenadeLauncherSkins.get(item.paintkit)
            : name.includes('wrench') && wrenchSkins.has(item.paintkit)
            ? wrenchSkins.get(item.paintkit)
            : name.includes('knife') && knifeSkins.has(item.paintkit)
            ? knifeSkins.get(item.paintkit)
            : item.defindex;

        if (oldDefindex !== item.defindex) {
          log('returned L751', { name, item });
          return item as Item;
        }
      }
    }

    if (name.includes('(paint: ')) {
      log('"Painted" - before loop', { name, item });

      name = name.replace('(paint: ', '').replace(')', '').trim();

      for (const paintC in this.paints) {
        const paint = paintC.toLowerCase();

        if (name.includes(paint)) {
          log('"Painted" - in loop, before', { name, item });

          name = name.replace(paint, '').trim();
          item.paint = this.paints[paintC];

          log('"Painted" - after', { name, item });
          break;
        }
      }
    }

    if (
      name.includes('kit fabricator') &&
      item.killstreak &&
      item.killstreak > 1
    ) {
      log('"Kit Fabricator" - before', { name, item });

      name = name.replace('kit fabricator', '').trim();
      item.defindex = item.killstreak > 2 ? 20003 : 20002;

      // Generic Fabricator Kit
      if (name) {
        const schemaItem = this.getItemByItemName(name);

        if (!schemaItem) {
          log('returned L830', { name, item });
          return item as Item;
        }

        item.target = schemaItem.defindex;
        item.quality = item.quality ?? schemaItem.item_quality; //default quality
      }

      if (!item.quality) item.quality = 6;

      item.output = item.killstreak > 2 ? 6526 : 6523;
      item.outputQuality = 6;

      log('"Kit Fabricator" - after', { name, item });
    }

    if (
      (!name.includes('strangifier chemistry set') ||
        name.includes("collector's")) &&
      name.includes('chemistry set')
    ) {
      log('"Collector\'s Chemistry Set" - before', { name, item });

      name = name
        .replace("collector's ", '')
        .replace('chemistry set', '')
        .trim();

      if (name.includes('festive') && !name.includes('a rather festive tree'))
        item.defindex = 20007;
      else item.defindex = 20006;

      const schemaItem = this.getItemByItemName(name);

      if (!schemaItem) {
        log('returned L873', { name, item });
        return item as Item;
      }

      item.output = schemaItem.defindex;
      item.outputQuality = 14;
      item.quality = item.quality ?? schemaItem.item_quality; //default quality

      log('"Collector\'s Chemistry Set" - after', { name, item });
    }

    // Reference: https://wiki.teamfortress.com/wiki/Chemistry_Set
    if (name.includes('strangifier chemistry set')) {
      log('"Strangifier Chemistry Set" - before', { name, item });

      name = name.replace('strangifier chemistry set', '').trim();

      const schemaItem = this.getItemByItemName(name);

      if (!schemaItem) {
        log('returned L1003', { name, item });
        return item as Item;
      }

      // Standardize defindex for Strangifier Chemistry Set
      item.defindex = 20000;
      item.target = schemaItem.defindex;
      item.quality = 6;
      item.output = 6522;
      item.outputQuality = 6;

      log('"Strangifier Chemistry Set" - after', { name, item });
    }

    if (name.includes('strangifier')) {
      log('"Strangifier" - before', { name, item });

      name = name.replace('strangifier', '').trim();

      // Standardize to use only 6522
      item.defindex = 6522;

      const schemaItem = this.getItemByItemName(name);

      if (!schemaItem) {
        log('returned L1047', { name, item });
        return item as Item;
      }

      item.target = schemaItem.defindex;
      item.quality = item.quality ?? schemaItem.item_quality; //default quality

      log('"Strangifier" - after', { name, item });
    }

    if (name.includes('kit') && item.killstreak) {
      log('"Kit" - before', { name, item });

      name = name.replace('kit', '').trim();

      // most new items only use this defindex, thus we ignore specific
      // defindex ks1.
      if (item.killstreak == 1) item.defindex = 6527;
      else if (item.killstreak == 2) item.defindex = 6523;
      else if (item.killstreak == 3) item.defindex = 6526;

      // If Generic Kit, ignore this
      if (name) {
        const schemaItem = this.getItemByItemName(name);

        if (!schemaItem) {
          log('returned L1093', { name, item });
          return item as Item;
        }

        item.target = schemaItem.defindex;
      }

      if (!item.quality) item.quality = 6;

      log('"Kit" - after', { name, item });
    }

    if (item.defindex) {
      log('returned L1114', { name, item });
      return item as Item;
    }

    if (typeof item.paintkit === 'number' && name.includes('war paint')) {
      log('"War Paint" - before', {
        name,
        item,
      });

      name = `Paintkit ${item.paintkit}`;

      if (!item.quality) item.quality = 15;

      for (const it of schema.items) {
        if (it.name == name) {
          item.defindex = it.defindex;
          break;
        }
      }

      log('"War Paint" - after', { name, item });
    } else {
      name = name.replace(' series ', ' ').replace(' series#', ' #');

      if (name.includes('salvaged mann co. supply crate #')) {
        log('"Salvaged Mann Co. Supply Crate"', { name, item });

        item.crateseries = +name.substring(32);
        item.defindex = 5068;
        item.quality = 6;

        log('returned L1158', { name, item });
        return item as Item;
      } else if (name.includes('select reserve mann co. supply crate #')) {
        item.defindex = 5660;
        item.crateseries = 60;
        item.quality = 6;

        return item as Item;
      } else if (name.includes('mann co. supply crate #')) {
        log('"Mann Co. Supply Crate"', { name, item });

        const crateseries = +name.substring(23);

        if (
          [
            1, 3, 7, 12, 13, 18, 19, 23, 26, 31, 34, 39, 43, 47, 54, 57, 75,
          ].includes(crateseries)
        ) {
          item.defindex = 5022;
        } else if (
          [
            2, 4, 8, 11, 14, 17, 20, 24, 27, 32, 37, 42, 44, 49, 56, 71, 76,
          ].includes(crateseries)
        ) {
          item.defindex = 5041;
        } else if (
          [
            5, 9, 10, 15, 16, 21, 25, 28, 29, 33, 38, 41, 45, 55, 59, 77,
          ].includes(crateseries)
        ) {
          item.defindex = 5045;
        }

        item.crateseries = crateseries;
        item.quality = 6;

        log('returned L1180', { name, item });
        return item as Item;
      } else if (name.includes('mann co. supply munition #')) {
        log('"Mann Co. Supply Munition"', { name, item });

        const crateseries = +name.substring(26);
        item.defindex = munitionCrate.get(crateseries);
        item.crateseries = crateseries;
        item.quality = 6;

        log('returned L1190', { name, item });
        return item as Item;
      }

      let number: number | undefined = undefined;

      if (name.includes('#')) {
        log('with # - before', { name, item });

        const withoutNumber = name.replace(/#\d+/, '');
        number = Number(name.substring(withoutNumber.length + 1).trim());
        name = name.replace(/#\d+/, '').trim();

        log('with # - after', { name, item });
      }

      if (retiredKeysNames.includes(name)) {
        const retiredKey = Object.values(retiredKeys).find(
          (key) => key.name.toLowerCase() === name,
        );

        if (retiredKey) {
          item.defindex = retiredKey.defindex;
          item.quality = item.quality ?? 6;

          log('returned L1224', { name, item });
          return item as Item;
        }
      }

      const schemaItem = this.getItemByItemNameWithThe(name);

      if (!schemaItem) {
        log('returned L1235', { name, item });
        return item as Item;
      }

      item.defindex = schemaItem.defindex;
      item.quality = item.quality ?? schemaItem.item_quality; //default quality

      // Fix defindex for Exclusive Genuine items
      if (item.quality === 1) {
        item.defindex = exclusiveGenuine.has(item.defindex)
          ? exclusiveGenuine.get(item.defindex)
          : item.defindex;
      }

      if (schemaItem.item_class === 'supply_crate') {
        log('with "supply_crate" - before', { name, item });

        item.crateseries = this.crateSeriesList?.[item.defindex as number];

        log('with "supply_crate" - after', { name, item });
      } else if (schemaItem.item_class !== 'supply_crate' && number != null) {
        log('not "supply_crate" and number != null - before', { name, item });

        item.craftnumber = number;

        log('not "supply_crate" and number != null - after', { name, item });
      }
    }

    log('returned L1277', { name, item });
    return item as Item;
  }

  /**
   * Gets schema item by defindex
   */
  getItemByDefindex(defindex: number): SchemaItem | null {
    const items = this.raw.schema.items;
    const itemsCount = items.length;

    let start = 0;
    let end = itemsCount - 1;

    for (
      let iterLim = Math.ceil(Math.log2(itemsCount)) + 2;
      start <= end && iterLim > 0;
      iterLim--
    ) {
      const mid = Math.floor((start + end) / 2);

      if (items[mid].defindex < defindex) start = mid + 1;
      else if (items[mid].defindex > defindex) end = mid - 1;
      else return items[mid];
    }

    return items.find((item) => item.defindex === defindex) ?? null;
  }

  /**
   * Gets schema item by item name
   */
  getItemByItemName(name: string): SchemaItem | null {
    for (const item of this.raw.schema.items) {
      if (name.toLowerCase() === item.item_name.toLowerCase()) {
        // skip and let it find Name Tag with defindex 5020
        if (item.item_name === 'Name Tag' && item.defindex === 2093) continue;

        // skip if Stock Quality
        if (item.item_quality === 0) continue;

        return item;
      }
    }

    return null;
  }

  /**
   * Gets schema item by sku
   */
  getItemBySKU(sku: string): SchemaItem | null {
    return this.getItemByDefindex(SKU.fromString(sku).defindex);
  }

  /**
   * Gets schema attribute by defindex
   */
  getAttributeByDefindex(defindex: number): SchemaAttribute | null {
    const attributes = this.raw.schema.attributes;
    const attributesCount = attributes.length;

    let start = 0;
    let end = attributesCount - 1;

    for (
      let iterLim = Math.ceil(Math.log2(attributesCount)) + 2;
      start <= end && iterLim > 0;
      iterLim--
    ) {
      const mid = Math.floor((start + end) / 2);

      if (attributes[mid].defindex < defindex) start = mid + 1;
      else if (attributes[mid].defindex > defindex) end = mid - 1;
      else return attributes[mid];
    }

    return (
      attributes.find((attribute) => attribute.defindex === defindex) ?? null
    );
  }

  /**
   * Gets quality name by id
   */
  getQualityById(id: number): string | null {
    const qualities = this.raw.schema.qualities;

    for (const type in qualities) {
      if (qualities[type] == null) continue;
      if (qualities[type] === id) return this.raw.schema.qualityNames[type];
    }

    return null;
  }

  /**
   * Gets quality id by name
   */
  getQualityIdByName(name: string): number | null {
    const qualityNames = this.raw.schema.qualityNames;

    for (const type in qualityNames) {
      if (qualityNames[type] == null) continue;

      if (name.toLowerCase() === qualityNames[type].toLowerCase())
        return this.raw.schema.qualities[type];
    }

    return null;
  }

  /**
   * Gets effect name by id
   */
  getEffectById(id: number): string | null {
    const particles = this.raw.schema.attribute_controlled_attached_particles;
    const particlesCount = particles.length;

    let start = 0;
    let end = particlesCount - 1;

    for (
      let iterLim = Math.ceil(Math.log2(particlesCount)) + 2;
      start <= end && iterLim > 0;
      iterLim--
    ) {
      const mid = Math.floor((start + end) / 2);

      if (particles[mid].id < id) start = mid + 1;
      else if (particles[mid].id > id) end = mid - 1;
      else return particles[mid].name;
    }

    return particles.find((effect) => effect.id === id)?.name ?? null;
  }

  /**
   * Gets effect id by name
   */
  getEffectIdByName(name: string): number | null {
    return (
      this.raw.schema.attribute_controlled_attached_particles.find(
        (effect) => effect.name.toLowerCase() === name.toLowerCase(),
      )?.id ?? null
    );
  }

  /**
   * Gets skin name by id
   */
  getSkinById(id: number): string | null {
    return this.raw.schema.paintkits[id] ?? null;
  }

  /**
   * Gets skin id by name
   */
  getSkinIdByName(name: string): number | null {
    const paintkits = this.raw.schema.paintkits;

    for (const id in paintkits) {
      if (paintkits[id] == null) continue;

      if (name.toLowerCase() === paintkits[id].toLowerCase())
        return parseInt(id);
    }

    return null;
  }

  /**
   * Gets the name and the id of unusual effects
   */
  getUnusualEffects(): Effect[] {
    return this.raw.schema.attribute_controlled_attached_particles.map((v) => {
      return { name: v.name, id: v.id };
    });
  }

  /**
   * Gets paint name by Decimal numeral system
   */
  getPaintNameByDecimal(decimal: number): string | null {
    if (decimal === 5801378) return 'Legacy Paint';

    const paintCans = this.raw.schema.items.filter(
      (item) => item.name.includes('Paint Can') && item.name !== 'Paint Can',
    );

    return (
      paintCans.find(
        (paint) => paint.attributes?.some((att) => att.value === decimal),
      )?.item_name ?? null
    );
  }

  /**
   * Gets paint Decimal numeral system by name
   */
  getPaintDecimalByName(name: string): number | null {
    if (name === 'Legacy Paint') return 5801378;

    const paintCans = this.raw.schema.items.filter(
      (item) => item.name.includes('Paint Can') && item.name !== 'Paint Can',
    );

    return (
      paintCans.find(
        (paint) => paint.item_name.toLowerCase() === name.toLowerCase(),
      )?.attributes?.[0]?.value ?? null
    );
  }

  /**
   * Gets the name and partial sku for painted items
   */
  getPaints(): Paints {
    if (this.paints !== undefined) return this.paints;

    const paintCans = this.raw.schema.items.filter(
      (item) => item.name.includes('Paint Can') && item.name !== 'Paint Can',
    );

    const paintsObject: Paints = {
      'Legacy Paint': 5801378,
    };

    for (const paintCan of paintCans) {
      if (paintCan.attributes === undefined) continue;

      paintsObject[paintCan.item_name] = paintCan.attributes[0].value;
    }

    return paintsObject;
  }

  /**
   * Gets an array of paintable items' defindex
   */
  getPaintableItemDefindexes(): number[] {
    return this.raw.schema.items
      .filter((item) => item.capabilities?.paintable)
      .map((item) => item.defindex);
  }

  /**
   * Gets the name and partial sku for strange parts items
   */
  getStrangeParts(): StrangeParts {
    const strangePartsObject: StrangeParts = {};
    const partsToExclude = [
      'Ubers',
      'Kill Assists',
      'Sentry Kills',
      'Sodden Victims',
      'Spies Shocked',
      'Heads Taken',
      'Humiliations',
      'Gifts Given',
      'Deaths Feigned',
      'Buildings Sapped',
      'Tickle Fights Won',
      'Opponents Flattened',
      'Food Items Eaten',
      'Banners Deployed',
      'Seconds Cloaked',
      'Health Dispensed to Teammates',
      'Teammates Teleported',
      'KillEaterEvent_UniquePlayerKills',
      'Points Scored',
      'Double Donks',
      'Teammates Whipped',
      'Wrangled Sentry Kills',
      'Carnival Kills',
      'Carnival Underworld Kills',
      'Carnival Games Won',
      'Contracts Completed',
      'Contract Points',
      'Contract Bonus Points',
      'Times Performed',
      'Kills and Assists during Invasion Event',
      'Kills and Assists on 2Fort Invasion',
      'Kills and Assists on Probed',
      'Kills and Assists on Byre',
      'Kills and Assists on Watergate',
      'Souls Collected',
      'Merasmissions Completed',
      'Halloween Transmutes Performed',
      'Power Up Canteens Used',
      'Contract Points Earned',
      'Contract Points Contributed To Friends',
    ];

    // Filter out built-in parts and also filter repeated "Kills"
    const strangeParts = this.raw.schema.kill_eater_score_types.filter(
      (part) =>
        !partsToExclude.includes(part.type_name) &&
        ![0, 97].includes(part.type),
    );

    for (const strangePart of strangeParts) {
      strangePartsObject[strangePart.type_name] = `sp${strangePart.type}`;
    }

    return strangePartsObject;
  }

  /**
   * Get an array of item objects for craftable weapons
   */
  getCraftableWeaponsSchema(): SchemaItem[] {
    const weaponsToExclude = [
      266, // Horseless Headless Horsemann's Headtaker
      452, // Three-Rune Blade
      466, // Maul
      474, // Conscientious Objector
      572, // Unarmed Combat
      574, // Wanga Prick
      587, // Apoco-Fists
      638, // Sharp Dresser
      735, // Sapper
      736, // Sapper
      737, // Construction PDA
      851, // AWPer Hand
      880, // Freedom Staff
      933, // Ap-Sap
      939, // Bat Outta Hell
      947, // Quäckenbirdt
      1013, // Ham Shank
      1152, // Grappling Hook
      30474, // Nostromo Napalmer
    ];

    return this.raw.schema.items.filter(
      (item) =>
        !weaponsToExclude.includes(item.defindex) &&
        item.item_quality === 6 &&
        item.craft_class === 'weapon',
    );
  }

  /**
   * Get an array of SKU for craftable weapons by class used for crafting
   * @return Array of SKUs for craftable weapons by class
   */
  getWeaponsForCraftingByClass(charClass: CharacterClasses): string[] {
    if (
      ![
        'Scout',
        'Soldier',
        'Pyro',
        'Demoman',
        'Heavy',
        'Engineer',
        'Medic',
        'Sniper',
        'Spy',
      ].includes(charClass)
    ) {
      throw new Error(
        `Entered class "${charClass}" is not a valid character class.` +
          `\nValid character classes (case sensitive): "Scout", "Soldier", "Pyro", "Demoman", "Heavy", "Engineer", "Medic", "Sniper", "Spy".`,
      );
    }

    return this.getCraftableWeaponsSchema()
      .filter((item) => item.used_by_classes.includes(charClass))
      .map((item) => `${item.defindex};6`);
  }

  /**
   * Get an array of SKU for Craftable weapons used for trading
   * @return Array of SKUs for Craftable weapons
   */
  getCraftableWeaponsForTrading(): string[] {
    return this.getCraftableWeaponsSchema().map((item) => `${item.defindex};6`);
  }

  /**
   * Get an array of SKU for Non-Craftable weapons used for trading
   * @return Array of SKUs for Non-Craftable weapons,
   * excluding Non-Craftable Sharpened Volcano Fragment and Non-Craftable Sun-on-a-Stick
   */
  getUncraftableWeaponsForTrading(): string[] {
    return this.getCraftableWeaponsSchema()
      .filter((item) => ![348, 349].includes(item.defindex))
      .map((item) => `${item.defindex};6;uncraftable`);
  }

  getCrateSeriesList() {
    const crateseries: CrateSeriesList = {};

    for (const item of this.raw.schema.items) {
      if (!item.attributes) continue;

      const seriesAttribute = item.attributes.find(
        (attribute) => attribute.name === 'set supply crate series',
      );

      if (seriesAttribute) crateseries[item.defindex] = seriesAttribute.value;
    }

    const items = this.raw.items_game.items;

    for (const defindex of Object.keys(items)) {
      const seriesAttribute =
        items[defindex]?.static_attrs?.['set supply crate series'];

      if (seriesAttribute) {
        crateseries[defindex] = Number(
          seriesAttribute?.value || seriesAttribute,
        );
      }
    }

    return crateseries;
  }

  getQualities(): Qualities {
    const schema = this.raw.schema;
    const qualities: Qualities = {};

    for (const quality in schema.qualities) {
      qualities[schema.qualityNames[quality]] = schema.qualities[quality];
    }

    return qualities;
  }

  getParticleEffects(): ParticleEffects {
    const particles: ParticleEffects = {};

    let previous = '';

    for (const particle of this.raw.schema
      .attribute_controlled_attached_particles) {
      const particleName = particle.name;

      if (particleName === previous) continue;

      previous = particleName;
      particles[particleName] = particle.id;
    }

    // REVIEW: Don't know why we are assigning these manually
    particles['Orbiting Fire'] = 33;
    particles['Ether Trail'] = 103;
    particles['Fragmenting Reality'] = 141;

    return particles;
  }

  getPaintKits(): Paintkits {
    const schema = this.raw.schema;
    const paintkits: Paintkits = {};

    for (const id in schema.paintkits) {
      paintkits[schema.paintkits[id]] = Number(id);
    }

    return paintkits;
  }

  checkExistence(item: Item): boolean {
    const schemaItem = this.getItemByDefindex(item.defindex);
    if (!schemaItem) return false;

    // default Normal (Stock items), Vintage (1156), Unusual (266, 267), and Strange (655) items
    if (
      [0, 3, 5, 11].includes(schemaItem.item_quality) &&
      item.quality !== schemaItem.item_quality
    )
      return false;

    // if quality not 1 AND item.defindex is the one that should be Genuine only, OR
    // if quality is 1 AND item.defindex is the one that can be any quality, return null.
    if (
      (item.quality !== 1 && exclusiveGenuineReversed.has(item.defindex)) ||
      (item.quality === 1 && exclusiveGenuine.has(item.defindex))
    )
      return false;

    if (retiredKeys[item.defindex as keyof typeof retiredKeys] !== undefined) {
      if ([5713, 5716, 5717, 5762].includes(item.defindex) && item.craftable)
        return false;
      else if (
        ![5791, 5792].includes(item.defindex) &&
        item.craftable === false
      )
        return false;
    }

    function haveOtherAttributeForCrateOrCase(): boolean {
      return (
        item.quality !== 6 ||
        item.killstreak !== 0 ||
        item.australium !== false ||
        item.effect != null ||
        item.festive !== false ||
        item.paintkit != null ||
        item.wear != null ||
        item.quality2 != null ||
        item.craftnumber != null ||
        item.target != null ||
        item.output != null ||
        item.outputQuality != null ||
        item.paint != null
      );
    }

    if (schemaItem.item_class === 'supply_crate' && item.crateseries == null) {
      // If not seriesless, return false
      // Mann Co. Director's Cut Reel, Mann Co. Audition Reel, and Mann Co. Stockpile Crate,
      if (![5739, 5760, 5737, 5738].includes(item.defindex)) return false;

      // Unlocked Creepy 5763, 5764, 5765, 5766, 5767, 5768, 5769, 5770, 5771
      // Unlocked Crates 5850, 5851, 5852, 5853, 5854, 5855, 5856, 5857, 5858, 5860
      if (haveOtherAttributeForCrateOrCase()) return false;
    }

    if (item.crateseries) {
      // Run a check if the input item is actually exist or not for crates/cases
      if (haveOtherAttributeForCrateOrCase()) return false;

      // Not a crate or case
      if (schemaItem.item_class !== 'supply_crate') return false;
      else if (
        ![
          1, 3, 7, 12, 13, 18, 19, 23, 26, 31, 34, 39, 43, 47, 54, 57, 75, 2, 4,
          8, 11, 14, 17, 20, 24, 27, 32, 37, 42, 44, 49, 56, 71, 76, 5, 9, 10,
          15, 16, 21, 25, 28, 29, 33, 38, 41, 45, 55, 59, 77, 30, 40, 50, 82,
          83, 84, 85, 90, 91, 92, 103,
        ].includes(item.crateseries)
      ) {
        if (
          !Object.values(this.crateSeriesList ?? {}).includes(item.crateseries)
        )
          return false;

        if (item.crateseries !== this.crateSeriesList?.[item.defindex])
          return false;
      } else if (
        !(
          ([
            1, 3, 7, 12, 13, 18, 19, 23, 26, 31, 34, 39, 43, 47, 54, 57, 75,
          ].includes(item.crateseries) &&
            item.defindex === 5022) ||
          ([
            2, 4, 8, 11, 14, 17, 20, 24, 27, 32, 37, 42, 44, 49, 56, 71, 76,
          ].includes(item.crateseries) &&
            item.defindex === 5041) ||
          ([
            5, 9, 10, 15, 16, 21, 25, 28, 29, 33, 38, 41, 45, 55, 59, 77,
          ].includes(item.crateseries) &&
            item.defindex === 5045) ||
          ([30, 40, 50].includes(item.crateseries) && item.defindex === 5068) ||
          (munitionCrate.has(item.crateseries) &&
            item.defindex === munitionCrate.get(item.crateseries))
        )
      )
        return false;
    }

    return true;
  }

  /**
   * Gets the name of an item with specific attributes
   * @param {Boolean} [proper = true] Use proper name when true (adds "The" if proper_name in schema is true)
   */
  getName(
    item: Item,
    proper: boolean = true,
    usePipeForSkin: boolean = false,
    scmFormat: boolean = false,
  ): string | null {
    const schemaItem = this.getItemByDefindex(item.defindex);
    if (!schemaItem) return null;

    let name = '';

    if (!scmFormat) {
      if (item.tradable === false) name = 'Non-Tradable ';
      if (item.craftable === false) name += 'Non-Craftable ';
    }

    if (item.quality2) {
      name +=
        this.getQualityById(item.quality2) +
        (!scmFormat && (item.wear != null || item.paintkit != null)
          ? '(e)'
          : '') +
        ' ';
    }

    // If the quality is Unique (and is Elevated quality), or not Unique,
    // Decorated, or Unusual, or if the quality is Unusual but it does not have
    // an effect, or if the item can only be unusual, then add the quality
    if (
      (item.quality === 6 && item.quality2) ||
      (item.quality !== 6 && item.quality !== 15 && item.quality !== 5) ||
      (item.quality === 5 && !item.effect) ||
      schemaItem.item_quality == 5
    )
      name += this.getQualityById(item.quality) + ' ';

    if (!scmFormat && item.effect)
      name += this.getEffectById(item.effect) + ' ';

    if (item.festive) name += 'Festivized ';

    if (item.killstreak && item.killstreak > 0)
      name +=
        ['Killstreak', 'Specialized Killstreak', 'Professional Killstreak'][
          item.killstreak - 1
        ] + ' ';

    if (item.target) {
      const targetItem = this.getItemByDefindex(item.target);
      if (!targetItem) return null;
      name += targetItem.item_name + ' ';
    }

    if (item.outputQuality && item.outputQuality !== 6)
      name = this.getQualityById(item.outputQuality) + ' ' + name;

    if (item.output) {
      const outputItem = this.getItemByDefindex(item.output);
      if (!outputItem) return null;
      name += outputItem.item_name + ' ';
    }

    if (item.australium) name += 'Australium ';

    if (typeof item.paintkit === 'number')
      name += this.getSkinById(item.paintkit) + (usePipeForSkin ? ' | ' : ' ');

    if (proper && name === '' && schemaItem.proper_name) name = 'The ';

    const retiredKey = retiredKeys[item.defindex as keyof typeof retiredKeys];

    if (retiredKey) name += retiredKey.name;
    else name += schemaItem.item_name;

    if (item.wear) {
      name +=
        ' (' +
        [
          'Factory New',
          'Minimal Wear',
          'Field-Tested',
          'Well-Worn',
          'Battle Scarred',
        ][item.wear - 1] +
        ')';
    }

    if (item.crateseries) {
      const hasAttr =
        schemaItem.attributes &&
        schemaItem.attributes[0].class === 'supply_crate_series';
      if (scmFormat) {
        if (hasAttr) name += ' Series %23' + item.crateseries;
      } else {
        name += ' #' + item.crateseries;
      }
    } else if (item.craftnumber) {
      name += ' #' + item.craftnumber;
    }

    if (!scmFormat && item.paint)
      name += ` (Paint: ${this.getPaintNameByDecimal(item.paint)})`;

    return name;
  }

  /**
   * Gets schema overview
   */
  static async getOverview(apiKey: string): Promise<Overview> {
    return SteamRequest<GetSchemaResponse>(
      'GET',
      'GetSchemaOverview',
      'v0001',
      {
        key: apiKey,
        language: language,
      },
    );
  }

  /**
   * Gets schema items
   */
  static async getItems(apiKey: string): Promise<SchemaItem[]> {
    return getAllSchemaItems(apiKey);
  }

  /**
   * Gets skins / paintkits from TF2 protodefs
   */
  static async getPaintKits(): Promise<Record<number, string>> {
    const res = await axios.get(
      'https://raw.githubusercontent.com/SteamDatabase/GameTracking-TF2/master/tf/resource/tf_proto_obj_defs_english.txt',
    );

    const parsed = vdf.parse<{
      lang: { Language: string; Tokens: Record<string, string> };
    }>(res.data);

    const protodefs = parsed['lang'].Tokens;
    const paintkits: { id: number; name: string }[] = [];

    for (const protodef in protodefs) {
      if (protodefs[protodef] == null) continue;

      const parts = protodef.split(' ')[0].split('_');

      if (parts.length !== 3 || parts[0] !== '9') continue;

      const def = parts[1];
      const name = protodefs[protodef];

      if (name.startsWith(def + ':')) continue;

      paintkits.push({ id: Number(def), name });
    }

    paintkits.sort((a, b) => a.id - b.id);

    const paintkitObj: Record<number, string> = {};

    for (const paintkit of paintkits) {
      if (!Object.values(paintkitObj).includes(paintkit.name))
        paintkitObj[paintkit.id] = paintkit.name;
    }

    return paintkitObj;
  }

  static async getItemsGame(): Promise<ItemsGame> {
    const res = await axios.get(
      'https://raw.githubusercontent.com/SteamDatabase/GameTracking-TF2/master/tf/scripts/items/items_game.txt',
    );

    return vdf.parse<{ items_game: ItemsGame }>(res.data).items_game;
  }

  /**
   * Creates data object used for initializing class
   */
  toJSON() {
    return {
      version: this.version,
      time: this.time,
      raw: this.raw,
    };
  }
}

/**
 * Recursive function that requests all schema items
 */
async function getAllSchemaItems(
  apiKey: string,
  next: number = 0,
  items?: SchemaItem[],
): Promise<SchemaItem[]> {
  const res = await SteamRequest(
    'GET',
    'GetSchemaItems',
    'v0001',
    { language, key: apiKey, start: next },
    undefined,
  );

  items = (items || []).concat(res.items);

  if (res.next) return getAllSchemaItems(apiKey, res.next, items);
  else return items;
}
