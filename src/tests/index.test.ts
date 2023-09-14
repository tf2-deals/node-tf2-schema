import SKU from '@tf2deals/tf2-sku';

import { TF2Schema } from '../index';

describe('TF2Schema', () => {
  const schema = new TF2Schema({ apiKey: 'YOUR API KEY HERE' });

  beforeAll(async () => {
    await schema.init();
  }, 30 * 1000);

  it('should have a version', () => {
    expect(schema!.schema!.version).toBeDefined();
  });

  it('should have a items', () => {
    expect(schema!.schema!.raw.schema.items).toBeDefined();
  });

  it('should have a paintkits', () => {
    expect(schema!.schema!.raw.schema.paintkits).toBeDefined();
  });

  it('should have a items_game', () => {
    expect(schema!.schema!.raw.items_game).toBeDefined();
  });

  it('should have a attributes', () => {
    expect(schema!.schema!.raw.schema.attributes).toBeDefined();
  });

  it("should get key SKU from it's name", () => {
    expect(schema!.schema!.getSkuFromName('Mann Co. Supply Crate Key')).toBe(
      '5021;6',
    );
  });

  it("should get unusual SKU from it's defindex", () => {
    expect(
      schema!.schema!.getSkuFromName('Unusual Orbiting Fire Gauzed Gaze'),
    ).toBe('30786;5;u33');
  });

  it("should get strange unusual SKU from it's name", () => {
    expect(
      schema!.schema!.getSkuFromName('Strange Treasure Trove Flame Warrior'),
    ).toBe('31357;5;u289;strange');
  });

  it("should get skin SKU from it's name", () => {
    expect(
      schema!.schema!.getSkuFromName(
        'Strange Pizza Polished Scattergun (Field-Tested)',
      ),
    ).toBe('200;11;w3;pk206');
  });

  it("should get normal quality SKU from it's name", () => {
    expect(
      schema!.schema!.getSkuFromName('Normal Professional Killstreak Batsaber'),
    ).toBe('30667;0;kt-3');
  });

  it("should get killstreak fab SKU from it's name", () => {
    expect(
      schema!.schema!.getSkuFromName(
        'Professional Killstreak Maul Kit Fabricator',
      ),
    ).toBe('20003;6;kt-3;td-466;od-6526;oq-6');
  });

  it('should get names from SKUs', () => {
    const SKUs = [
      '5021;6',
      '30786;5;u33',
      '31357;5;u289;strange',
      '200;11;w3;pk206',
      '30667;0;kt-3',
      '20003;6;kt-3;td-466;od-6526;oq-6',
    ];

    const names = [
      'Mann Co. Supply Crate Key',
      'Orbiting Fire Gauzed Gaze',
      'Strange Treasure Trove Flame Warrior',
      'Strange Pizza Polished Scattergun (Field-Tested)',
      'Normal Professional Killstreak Batsaber',
      'Professional Killstreak Maul Kit Fabricator',
    ];

    SKUs.forEach((sku, i) => {
      expect(schema!.schema!.getName(SKU.fromString(sku) as Item)).toBe(
        names[i],
      );
    });
  });
});
