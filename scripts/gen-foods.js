#!/usr/bin/env node
// SPDX-License-Identifier: MIT
/**
 * 生成 data/foods.json（v2.4.0 起）。用法：node scripts/gen-foods.js
 *
 * - 「原料」条目：每 100g 可食部近似值，参考 USDA FoodData Central（公有领域 / CC0），
 *   ref 字段写明所参考的 USDA 条目英文描述（便于在 fdc.nal.usda.gov 检索核对），数值经四舍五入整理。
 * - 「熟菜 / 主食 / 汤粥」条目：按本项目自拟的家常配方（生重克数）由库内原料逐项累加，
 *   再按熟重系数（烹调失水）折算为每 100g；ref 字段写明配方与熟重系数。
 * - 不复制任何第三方食物成分表或数据集（含《中国食物成分表》），数值仅供估算。
 * - 旧版（v2.1–v2.3）已有条目保留原 id 与数值，仅补充 ref。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'foods.json');
const db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const SRC_USDA = '自整理（参考 USDA FoodData Central，CC0）';
const SRC_RECIPE = '自拟配方计算（原料参考 USDA FoodData Central，CC0）';
const U = (s) => 'USDA FDC: ' + s;

// [id, 名称, 分类, [kcal, p, c, f, fib, na], 别名, 份量 [[单位, 克], ...], USDA 参考条目]
const BASE = [
  // 主食与谷薯
  [
    'wheat-flour',
    '小麦粉（中筋，生）',
    '主食',
    [364, 10.3, 76.3, 1.0, 2.7, 2],
    ['面粉', '中筋面粉', '普通面粉'],
    [['勺', 10]],
    'Wheat flour, white, all-purpose, unenriched'
  ],
  [
    'wholewheat-flour',
    '全麦粉（生）',
    '主食',
    [340, 13.2, 72.0, 2.5, 10.7, 2],
    ['全麦面粉'],
    [],
    'Flour, whole wheat, unenriched'
  ],
  [
    'rice-raw',
    '大米（生）',
    '主食',
    [365, 7.1, 80.0, 0.7, 1.3, 5],
    ['生米', '大米'],
    [['杯', 180]],
    'Rice, white, long-grain, regular, raw, unenriched'
  ],
  [
    'glutinous-rice-raw',
    '糯米（生）',
    '主食',
    [370, 6.8, 81.7, 0.6, 2.8, 7],
    ['江米', '糯米粉'],
    [],
    'Rice, white, glutinous, unenriched, uncooked'
  ],
  [
    'glutinous-rice-cooked',
    '糯米饭（熟）',
    '主食',
    [97, 2.0, 21.1, 0.2, 1.0, 5],
    ['糯米饭'],
    [['碗', 200]],
    'Rice, white, glutinous, cooked'
  ],
  ['millet-raw', '小米（生）', '主食', [378, 11.0, 72.9, 4.2, 8.5, 5], ['黄小米'], [], 'Millet, raw'],
  ['millet-cooked', '小米饭（熟）', '主食', [119, 3.5, 23.7, 1.0, 1.3, 2], [], [['碗', 200]], 'Millet, cooked'],
  [
    'rice-flour',
    '米粉（粉末，生）',
    '主食',
    [366, 6.0, 80.1, 1.4, 2.4, 0],
    ['粘米粉', '大米粉（粉末）'],
    [],
    'Rice flour, white, unenriched'
  ],
  [
    'cellophane-noodles-dry',
    '粉丝（绿豆，干）',
    '主食',
    [351, 0.2, 86.1, 0.1, 0.5, 10],
    ['粉丝', '绿豆粉丝', '粉条'],
    [['把', 50]],
    'Noodles, chinese, cellophane or long rice (mung beans), dehydrated'
  ],
  [
    'rice-noodles-cooked',
    '米粉 / 河粉（熟）',
    '主食',
    [108, 1.8, 24.0, 0.2, 1.0, 19],
    ['米线', '河粉', '米粉'],
    [['碗', 300]],
    'Rice noodles, cooked'
  ],
  [
    'soba-cooked',
    '荞麦面（熟）',
    '主食',
    [99, 5.1, 21.4, 0.1, 0.0, 60],
    ['荞麦面'],
    [['碗', 250]],
    'Noodles, japanese, soba, cooked'
  ],
  [
    'spaghetti-cooked',
    '意大利面（熟）',
    '主食',
    [158, 5.8, 30.9, 0.9, 1.8, 1],
    ['意面', '通心粉'],
    [['份', 220]],
    'Pasta, cooked, unenriched, without added salt'
  ],
  [
    'white-bread',
    '白面包（吐司）',
    '主食',
    [266, 7.6, 50.6, 3.3, 2.4, 490],
    ['吐司', '面包', '白吐司'],
    [['片', 30]],
    'Bread, white, commercially prepared'
  ],
  [
    'oatmeal-cooked',
    '燕麦粥（水煮）',
    '主食',
    [71, 2.5, 12.0, 1.5, 1.7, 4],
    ['燕麦粥'],
    [['碗', 250]],
    'Cereals, oats, regular and quick, not fortified, cooked with water, without salt'
  ],
  [
    'taro-cooked',
    '芋头（熟）',
    '主食',
    [142, 0.5, 34.6, 0.1, 5.1, 15],
    ['芋头', '芋艿', '香芋'],
    [['个', 80]],
    'Taro, cooked, without salt'
  ],
  [
    'lotus-root-cooked',
    '莲藕（熟）',
    '蔬果',
    [66, 1.6, 16.0, 0.1, 3.1, 45],
    ['藕'],
    [['节', 150]],
    'Lotus root, cooked, boiled, drained, without salt'
  ],
  [
    'potato-raw',
    '土豆（生）',
    '主食',
    [77, 2.1, 17.5, 0.1, 2.1, 6],
    ['马铃薯', '洋芋', '土豆丝'],
    [['个', 200]],
    'Potatoes, flesh and skin, raw'
  ],
  [
    'sweet-potato-raw',
    '红薯（生）',
    '主食',
    [86, 1.6, 20.1, 0.1, 3.0, 55],
    ['地瓜', '番薯'],
    [['个', 250]],
    'Sweet potato, raw, unprepared'
  ],
  [
    'chestnut-roasted',
    '板栗（熟）',
    '主食',
    [245, 3.2, 53.0, 2.2, 5.1, 2],
    ['栗子', '糖炒栗子'],
    [['颗', 8]],
    'Nuts, chestnuts, european, roasted'
  ],
  [
    'instant-noodles-dry',
    '方便面（干，含调料，因品牌差异大）',
    '主食',
    [440, 10.0, 60.0, 17.5, 2.4, 1700],
    ['泡面', '方便面'],
    [['包', 100]],
    'Soup, ramen noodle, any flavor, dry（近似）'
  ],
  [
    'popcorn',
    '爆米花（无油）',
    '零食饮料',
    [387, 12.9, 77.8, 4.5, 14.5, 8],
    ['爆米花'],
    [['杯', 8]],
    'Snacks, popcorn, air-popped'
  ],
  // 肉蛋水产豆制品
  [
    'chicken-breast-raw',
    '鸡胸肉（生，去皮）',
    '蛋白质',
    [120, 22.5, 0, 2.6, 0, 45],
    ['生鸡胸', '鸡胸（生）'],
    [['块', 200]],
    'Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw'
  ],
  [
    'chicken-thigh-raw',
    '鸡腿肉（生，去皮）',
    '蛋白质',
    [119, 19.7, 0, 3.9, 0, 95],
    ['鸡腿肉', '去骨鸡腿'],
    [['块', 150]],
    'Chicken, broilers or fryers, thigh, meat only, raw'
  ],
  [
    'chicken-wing-raw',
    '鸡翅（生）',
    '蛋白质',
    [222, 18.3, 0, 16.0, 0, 73],
    ['生鸡翅'],
    [['个', 45]],
    'Chicken, broilers or fryers, wing, meat and skin, raw'
  ],
  [
    'chicken-roasted',
    '鸡肉（带皮，烤）',
    '蛋白质',
    [239, 27.3, 0, 13.6, 0, 82],
    ['烤鸡', '烤鸡肉'],
    [['份', 150]],
    'Chicken, broilers or fryers, meat and skin, cooked, roasted'
  ],
  [
    'chicken-stewed',
    '白切鸡 / 白煮鸡（带皮）',
    '蛋白质',
    [219, 24.5, 0, 12.6, 0, 67],
    ['白切鸡', '白斩鸡', '手撕鸡'],
    [['份', 150]],
    'Chicken, broilers or fryers, meat and skin, cooked, stewed'
  ],
  [
    'chicken-liver',
    '鸡肝（生）',
    '蛋白质',
    [119, 16.9, 0.7, 4.8, 0, 71],
    ['鸡肝'],
    [],
    'Chicken, liver, all classes, raw'
  ],
  [
    'roast-duck',
    '烤鸭（带皮）',
    '蛋白质',
    [337, 19.0, 0, 28.4, 0, 59],
    ['北京烤鸭', '烧鸭'],
    [['份', 150]],
    'Duck, domesticated, meat and skin, cooked, roasted'
  ],
  [
    'pork-belly-raw',
    '五花肉（生）',
    '蛋白质',
    [518, 9.3, 0, 53.0, 0, 32],
    ['五花肉', '猪五花'],
    [['块', 100]],
    'Pork, fresh, belly, raw'
  ],
  [
    'pork-ground-raw',
    '猪肉末（生）',
    '蛋白质',
    [263, 16.9, 0, 21.2, 0, 56],
    ['肉末', '猪肉馅', '肉馅'],
    [],
    'Pork, fresh, ground, raw'
  ],
  [
    'pork-ribs-raw',
    '猪排骨（生）',
    '蛋白质',
    [277, 15.5, 0, 23.4, 0, 81],
    ['排骨', '肋排', '猪排骨'],
    [['块', 40]],
    'Pork, fresh, spareribs, separable lean and fat, raw'
  ],
  [
    'pork-liver',
    '猪肝（生）',
    '蛋白质',
    [134, 21.4, 2.5, 3.7, 0, 87],
    ['猪肝'],
    [],
    'Pork, fresh, variety meats and by-products, liver, raw'
  ],
  [
    'beef-ground-raw',
    '牛肉末（生，80% 瘦）',
    '蛋白质',
    [254, 17.2, 0, 20.0, 0, 66],
    ['牛肉馅', '牛肉末'],
    [],
    'Beef, ground, 80% lean meat / 20% fat, raw'
  ],
  [
    'beef-jerky',
    '牛肉干（因品牌差异大）',
    '蛋白质',
    [410, 33.2, 11.0, 25.6, 1.8, 1785],
    ['牛肉干', '牛肉粒'],
    [['袋', 50]],
    'Snacks, beef jerky, chopped and formed'
  ],
  [
    'bacon-cooked',
    '培根（熟）',
    '蛋白质',
    [541, 37.0, 1.4, 41.8, 0, 1717],
    ['培根'],
    [['片', 8]],
    'Pork, cured, bacon, cooked, pan-fried'
  ],
  [
    'ham-sliced',
    '火腿片',
    '蛋白质',
    [163, 16.6, 3.8, 8.6, 1.3, 1203],
    ['火腿', '三明治火腿'],
    [['片', 15]],
    'Ham, sliced, regular (approximately 11% fat)'
  ],
  [
    'egg-white',
    '鸡蛋清',
    '蛋白质',
    [52, 10.9, 0.7, 0.2, 0, 166],
    ['蛋白', '蛋清'],
    [['个', 33]],
    'Egg, white, raw, fresh'
  ],
  ['egg-yolk', '鸡蛋黄', '蛋白质', [322, 15.9, 3.6, 26.5, 0, 48], ['蛋黄'], [['个', 17]], 'Egg, yolk, raw, fresh'],
  [
    'egg-boiled',
    '水煮蛋',
    '蛋白质',
    [155, 12.6, 1.1, 10.6, 0, 124],
    ['煮鸡蛋', '白煮蛋', '水煮鸡蛋'],
    [['个', 50]],
    'Egg, whole, cooked, hard-boiled'
  ],
  [
    'egg-fried',
    '煎蛋',
    '蛋白质',
    [196, 13.6, 0.8, 14.8, 0, 207],
    ['荷包蛋', '煎鸡蛋'],
    [['个', 46]],
    'Egg, whole, cooked, fried'
  ],
  [
    'tilapia-raw',
    '罗非鱼（生）',
    '蛋白质',
    [96, 20.1, 0, 1.7, 0, 52],
    ['罗非鱼', '非洲鲫鱼'],
    [],
    'Fish, tilapia, raw'
  ],
  ['carp-raw', '鲤鱼（生）', '蛋白质', [127, 17.8, 0, 5.6, 0, 49], ['鲤鱼', '鲫鱼'], [], 'Fish, carp, raw'],
  [
    'crab-cooked',
    '蟹肉（熟）',
    '蛋白质',
    [83, 17.9, 0, 0.7, 0, 395],
    ['螃蟹', '蟹', '大闸蟹'],
    [['只', 60]],
    'Crustaceans, crab, blue, cooked, moist heat'
  ],
  [
    'oyster-raw',
    '生蚝 / 牡蛎（生）',
    '蛋白质',
    [81, 9.5, 5.0, 2.3, 0, 106],
    ['生蚝', '牡蛎', '蚝'],
    [['个', 25]],
    'Mollusks, oyster, Pacific, raw'
  ],
  [
    'clam-raw',
    '蛤蜊肉（生）',
    '蛋白质',
    [86, 14.7, 3.6, 1.0, 0, null],
    ['蛤蜊', '花甲', '蚬子'],
    [],
    'Mollusks, clam, mixed species, raw'
  ],
  [
    'tofu-soft',
    '嫩豆腐 / 内酯豆腐',
    '蛋白质',
    [61, 6.6, 1.8, 3.7, 0.2, 8],
    ['嫩豆腐', '内酯豆腐', '南豆腐'],
    [['盒', 350]],
    'Tofu, soft, prepared with calcium sulfate and magnesium chloride (nigari)'
  ],
  [
    'tofu-fried',
    '油豆腐 / 炸豆腐',
    '蛋白质',
    [270, 18.8, 8.9, 20.2, 3.9, 16],
    ['油豆腐', '豆泡', '炸豆腐'],
    [],
    'Tofu, fried'
  ],
  [
    'soybean-dry',
    '黄豆（干）',
    '蛋白质',
    [446, 36.5, 30.2, 19.9, 9.3, 2],
    ['黄豆', '大豆'],
    [],
    'Soybeans, mature seeds, raw'
  ],
  [
    'black-beans-cooked',
    '黑豆（熟）',
    '蛋白质',
    [132, 8.9, 23.7, 0.5, 8.7, 1],
    ['黑豆'],
    [],
    'Beans, black, mature seeds, cooked, boiled, without salt'
  ],
  [
    'adzuki-cooked',
    '红豆（熟）',
    '主食',
    [128, 7.5, 24.8, 0.1, 7.3, 8],
    ['红豆', '赤小豆'],
    [],
    'Beans, adzuki, mature seeds, cooked, boiled, without salt'
  ],
  [
    'mung-beans-cooked',
    '绿豆（熟）',
    '主食',
    [105, 7.0, 19.2, 0.4, 7.6, 2],
    ['绿豆'],
    [],
    'Mung beans, mature seeds, cooked, boiled, without salt'
  ],
  [
    'lentils-cooked',
    '小扁豆（熟）',
    '蛋白质',
    [116, 9.0, 20.1, 0.4, 7.9, 2],
    ['扁豆', '兵豆'],
    [],
    'Lentils, mature seeds, cooked, boiled, without salt'
  ],
  // 乳制品
  [
    'milk-skim',
    '脱脂牛奶',
    '乳制品',
    [34, 3.4, 5.0, 0.1, 0, 42],
    ['脱脂奶'],
    [['盒', 250]],
    'Milk, nonfat, fluid, with added vitamin A and vitamin D'
  ],
  [
    'milk-lowfat',
    '低脂牛奶（2%）',
    '乳制品',
    [50, 3.3, 4.8, 2.0, 0, 47],
    ['低脂奶', '低脂牛奶'],
    [['盒', 250]],
    'Milk, reduced fat, fluid, 2% milkfat'
  ],
  [
    'yogurt-plain',
    '原味酸奶（全脂，无糖）',
    '乳制品',
    [61, 3.5, 4.7, 3.3, 0, 46],
    ['无糖酸奶', '原味酸奶'],
    [['杯', 200]],
    'Yogurt, plain, whole milk'
  ],
  [
    'yogurt-fruit',
    '风味酸奶（含糖，因品牌差异大）',
    '乳制品',
    [99, 4.0, 18.6, 1.2, 0, 53],
    ['酸奶', '果味酸奶'],
    [['杯', 200]],
    'Yogurt, fruit, low fat（近似）'
  ],
  [
    'mozzarella',
    '马苏里拉奶酪',
    '乳制品',
    [300, 22.2, 2.2, 22.4, 0, 627],
    ['马苏里拉', '芝士', '披萨奶酪'],
    [],
    'Cheese, mozzarella, whole milk'
  ],
  [
    'butter',
    '黄油（含盐）',
    '油脂坚果',
    [717, 0.9, 0.1, 81.1, 0, 643],
    ['黄油', '牛油'],
    [['勺', 14]],
    'Butter, salted'
  ],
  [
    'milk-powder',
    '全脂奶粉',
    '乳制品',
    [496, 26.3, 38.4, 26.7, 0, 371],
    ['奶粉'],
    [['勺', 10]],
    'Milk, dry, whole, with added vitamin D'
  ],
  [
    'ice-cream',
    '冰淇淋（香草）',
    '零食饮料',
    [207, 3.5, 23.6, 11.0, 0.7, 80],
    ['冰淇淋', '雪糕'],
    [['球', 66]],
    'Ice creams, vanilla'
  ],
  // 蔬菜（生）
  [
    'bok-choy',
    '小白菜 / 上海青',
    '蔬果',
    [13, 1.5, 2.2, 0.2, 1.0, 65],
    ['小白菜', '上海青', '青菜', '油菜'],
    [['把', 200]],
    'Cabbage, chinese (pak-choi), raw'
  ],
  [
    'gai-lan-cooked',
    '芥兰（熟）',
    '蔬果',
    [22, 1.1, 3.8, 0.7, 2.5, 7],
    ['芥兰', '芥蓝'],
    [],
    'Broccoli, chinese, cooked'
  ],
  [
    'cabbage',
    '圆白菜 / 包菜',
    '蔬果',
    [25, 1.3, 5.8, 0.1, 2.5, 18],
    ['包菜', '卷心菜', '圆白菜', '洋白菜'],
    [],
    'Cabbage, raw'
  ],
  ['red-cabbage', '紫甘蓝', '蔬果', [31, 1.4, 7.4, 0.2, 2.1, 27], ['紫甘蓝', '紫包菜'], [], 'Cabbage, red, raw'],
  ['cauliflower', '花菜', '蔬果', [25, 1.9, 5.0, 0.3, 2.0, 30], ['菜花', '花椰菜', '有机花菜'], [], 'Cauliflower, raw'],
  [
    'green-beans',
    '四季豆',
    '蔬果',
    [31, 1.8, 7.0, 0.2, 2.7, 6],
    ['四季豆', '芸豆', '豆角'],
    [],
    'Beans, snap, green, raw'
  ],
  ['snow-peas', '荷兰豆', '蔬果', [42, 2.8, 7.6, 0.2, 2.6, 4], ['荷兰豆', '甜豆'], [], 'Peas, edible-podded, raw'],
  ['green-peas', '豌豆', '蔬果', [81, 5.4, 14.5, 0.4, 5.7, 5], ['青豆', '豌豆粒'], [], 'Peas, green, raw'],
  ['asparagus', '芦笋', '蔬果', [20, 2.2, 3.9, 0.1, 2.1, 2], ['芦笋'], [], 'Asparagus, raw'],
  [
    'zucchini',
    '西葫芦',
    '蔬果',
    [17, 1.2, 3.1, 0.3, 1.0, 8],
    ['西葫芦', '角瓜'],
    [],
    'Squash, summer, zucchini, includes skin, raw'
  ],
  ['bitter-melon', '苦瓜', '蔬果', [17, 1.0, 3.7, 0.2, 2.8, 5], ['凉瓜'], [], 'Balsam-pear (bitter gourd), pods, raw'],
  ['luffa', '丝瓜', '蔬果', [20, 1.2, 4.4, 0.2, 1.1, 3], ['丝瓜'], [], 'Gourd, dishcloth (towelgourd), raw'],
  ['okra', '秋葵', '蔬果', [33, 1.9, 7.5, 0.2, 3.2, 7], ['秋葵'], [], 'Okra, raw'],
  ['daikon', '白萝卜', '蔬果', [18, 0.6, 4.1, 0.1, 1.6, 21], ['萝卜', '白萝卜'], [], 'Radishes, oriental, raw'],
  [
    'bamboo-shoots-cooked',
    '竹笋（熟）',
    '蔬果',
    [12, 1.5, 1.5, 0.2, 1.0, 4],
    ['竹笋', '笋', '春笋', '冬笋'],
    [],
    'Bamboo shoots, cooked, boiled, drained, without salt'
  ],
  ['garlic', '大蒜', '蔬果', [149, 6.4, 33.1, 0.5, 2.1, 17], ['蒜', '蒜头', '蒜蓉'], [['瓣', 4]], 'Garlic, raw'],
  ['ginger', '生姜', '蔬果', [80, 1.8, 17.8, 0.8, 2.0, 13], ['姜'], [], 'Ginger root, raw'],
  [
    'scallion',
    '小葱 / 大葱',
    '蔬果',
    [32, 1.8, 7.3, 0.2, 2.6, 16],
    ['葱', '香葱', '葱花', '大葱'],
    [],
    'Onions, spring or scallions (includes tops and bulb), raw'
  ],
  ['chinese-chives', '韭菜', '蔬果', [30, 3.3, 4.4, 0.7, 2.5, 3], ['韭菜'], [], 'Chives, raw（韭菜近似）'],
  [
    'water-spinach',
    '空心菜',
    '蔬果',
    [19, 2.6, 3.1, 0.2, 2.1, 113],
    ['空心菜', '通菜', '蕹菜'],
    [],
    'Water spinach, raw'
  ],
  ['amaranth-leaves', '苋菜', '蔬果', [23, 2.5, 4.0, 0.3, null, 20], ['苋菜', '红苋菜'], [], 'Amaranth leaves, raw'],
  ['coriander', '香菜', '蔬果', [23, 2.1, 3.7, 0.5, 2.8, 46], ['芫荽'], [], 'Coriander (cilantro) leaves, raw'],
  [
    'white-mushroom',
    '口蘑 / 白蘑菇',
    '蔬果',
    [22, 3.1, 3.3, 0.3, 1.0, 5],
    ['口蘑', '蘑菇', '白蘑菇'],
    [],
    'Mushrooms, white, raw'
  ],
  ['oyster-mushroom', '平菇', '蔬果', [33, 3.3, 6.1, 0.4, 2.3, 18], ['平菇', '蚝菇'], [], 'Mushrooms, oyster, raw'],
  [
    'wood-ear',
    '黑木耳（泡发）',
    '蔬果',
    [25, 0.5, 6.8, 0.0, null, 9],
    ['木耳', '黑木耳'],
    [],
    "Mushrooms, jew's ear, (pepeao), raw"
  ],
  [
    'shiitake-dried',
    '香菇（干）',
    '蔬果',
    [296, 9.6, 75.4, 1.0, 11.5, 13],
    ['干香菇', '冬菇'],
    [['朵', 4]],
    'Mushrooms, shiitake, dried'
  ],
  [
    'red-pepper',
    '红甜椒',
    '蔬果',
    [31, 1.0, 6.0, 0.3, 2.1, 4],
    ['彩椒', '红椒', '甜椒'],
    [['个', 150]],
    'Peppers, sweet, red, raw'
  ],
  [
    'chili-pepper',
    '辣椒（鲜）',
    '蔬果',
    [40, 1.9, 8.8, 0.4, 1.5, 9],
    ['小米辣', '尖椒', '辣椒', '干辣椒'],
    [],
    'Peppers, hot chili, red, raw'
  ],
  // 水果
  ['peach', '桃子', '蔬果', [39, 0.9, 9.5, 0.3, 1.5, 0], ['桃', '水蜜桃'], [['个', 150]], 'Peaches, yellow, raw'],
  ['plum', '李子', '蔬果', [46, 0.7, 11.4, 0.3, 1.4, 0], ['李子'], [['个', 65]], 'Plums, raw'],
  ['pineapple', '菠萝', '蔬果', [50, 0.5, 13.1, 0.1, 1.4, 1], ['凤梨'], [], 'Pineapple, raw, all varieties'],
  ['papaya', '木瓜', '蔬果', [43, 0.5, 10.8, 0.3, 1.7, 8], ['木瓜'], [], 'Papayas, raw'],
  ['pomelo', '柚子', '蔬果', [38, 0.8, 9.6, 0.0, 1.0, 1], ['柚子', '西柚', '文旦'], [], 'Pummelo, raw'],
  ['lychee', '荔枝', '蔬果', [66, 0.8, 16.5, 0.4, 1.3, 1], ['荔枝'], [['颗', 10]], 'Litchis, raw'],
  ['longan', '龙眼', '蔬果', [60, 1.3, 15.1, 0.1, 1.1, 0], ['桂圆', '龙眼'], [['颗', 8]], 'Longans, raw'],
  ['persimmon', '柿子', '蔬果', [70, 0.6, 18.6, 0.2, 3.6, 1], ['柿子'], [['个', 170]], 'Persimmons, japanese, raw'],
  [
    'tangerine',
    '橘子',
    '蔬果',
    [53, 0.8, 13.3, 0.3, 1.8, 2],
    ['橘子', '砂糖橘', '桔子'],
    [['个', 80]],
    'Tangerines, (mandarin oranges), raw'
  ],
  ['lemon', '柠檬', '蔬果', [29, 1.1, 9.3, 0.3, 2.8, 2], ['柠檬'], [], 'Lemons, raw, without peel'],
  [
    'cantaloupe',
    '哈密瓜 / 甜瓜',
    '蔬果',
    [34, 0.8, 8.2, 0.2, 0.9, 16],
    ['哈密瓜', '甜瓜', '香瓜'],
    [],
    'Melons, cantaloupe, raw'
  ],
  [
    'jujube-dried',
    '红枣（干）',
    '蔬果',
    [281, 3.7, 73.6, 1.1, null, 9],
    ['红枣', '大枣', '枣'],
    [['颗', 10]],
    'Jujube, Chinese, fresh, dried（近似）'
  ],
  ['raisin', '葡萄干', '蔬果', [299, 3.1, 79.2, 0.5, 3.7, 11], ['葡萄干'], [], 'Raisins, seedless'],
  ['pomegranate', '石榴', '蔬果', [83, 1.7, 18.7, 1.2, 4.0, 3], ['石榴'], [], 'Pomegranates, raw'],
  ['guava', '番石榴', '蔬果', [68, 2.6, 14.3, 1.0, 5.4, 2], ['芭乐', '番石榴'], [], 'Guavas, common, raw'],
  ['durian', '榴莲', '蔬果', [147, 1.5, 27.1, 5.3, 3.8, 2], ['榴莲'], [], 'Durian, raw or frozen'],
  // 坚果、种子与油脂
  [
    'sesame-seeds',
    '芝麻',
    '油脂坚果',
    [573, 17.7, 23.5, 49.7, 11.8, 11],
    ['白芝麻', '黑芝麻'],
    [['勺', 9]],
    'Seeds, sesame seeds, whole, dried'
  ],
  [
    'sunflower-seeds',
    '葵花籽（熟，去壳）',
    '油脂坚果',
    [582, 19.3, 24.1, 49.8, 9.0, 3],
    ['瓜子', '葵花籽', '瓜子仁'],
    [['把', 20]],
    'Seeds, sunflower seed kernels, dry roasted, without salt'
  ],
  [
    'pumpkin-seeds',
    '南瓜子（去壳）',
    '油脂坚果',
    [559, 30.2, 10.7, 49.1, 6.0, 7],
    ['南瓜子'],
    [],
    'Seeds, pumpkin and squash seed kernels, dried'
  ],
  [
    'peanut-butter',
    '花生酱',
    '油脂坚果',
    [588, 25.1, 19.6, 50.4, 6.0, null],
    ['花生酱'],
    [['勺', 16]],
    'Peanut butter, smooth style, with salt'
  ],
  [
    'chia-seeds',
    '奇亚籽',
    '油脂坚果',
    [486, 16.5, 42.1, 30.7, 34.4, 16],
    ['奇亚籽'],
    [['勺', 12]],
    'Seeds, chia seeds, dried'
  ],
  [
    'flaxseed',
    '亚麻籽',
    '油脂坚果',
    [534, 18.3, 28.9, 42.2, 27.3, 30],
    ['亚麻籽', '胡麻籽'],
    [['勺', 10]],
    'Seeds, flaxseed'
  ],
  [
    'macadamia',
    '夏威夷果',
    '油脂坚果',
    [718, 7.9, 13.8, 75.8, 8.6, 5],
    ['夏威夷果', '澳洲坚果'],
    [],
    'Nuts, macadamia nuts, raw'
  ],
  ['hazelnut', '榛子', '油脂坚果', [628, 15.0, 16.7, 60.8, 9.7, 0], ['榛子'], [], 'Nuts, hazelnuts or filberts'],
  [
    'veg-oil',
    '植物油（大豆油 / 花生油）',
    '油脂坚果',
    [884, 0, 0, 100, 0, 0],
    ['食用油', '植物油', '花生油', '大豆油', '菜籽油', '油'],
    [['勺', 10]],
    'Oil, soybean, salad or cooking（花生油等植物油热量相同）'
  ],
  [
    'sesame-oil',
    '芝麻油（香油）',
    '油脂坚果',
    [884, 0, 0, 100, 0, 0],
    ['香油', '麻油', '芝麻油'],
    [['勺', 5]],
    'Oil, sesame, salad or cooking'
  ],
  ['lard', '猪油', '油脂坚果', [902, 0, 0, 100, 0, 0], ['猪油', '荤油'], [['勺', 13]], 'Lard'],
  // 调味品
  ['salt', '食盐', '调味品', [0, 0, 0, 0, 0, 38758], ['盐'], [['勺', 6]], 'Salt, table'],
  [
    'soy-sauce',
    '酱油（生抽）',
    '调味品',
    [53, 8.1, 4.9, 0.6, 0.8, 5493],
    ['生抽', '酱油', '老抽'],
    [['勺', 15]],
    'Soy sauce made from soy and wheat (shoyu)'
  ],
  [
    'oyster-sauce',
    '蚝油',
    '调味品',
    [51, 1.4, 10.9, 0.3, 0.3, 2733],
    ['蚝油'],
    [['勺', 18]],
    'Sauce, oyster, ready-to-serve'
  ],
  [
    'vinegar',
    '醋',
    '调味品',
    [18, 0, 0.0, 0, 0, 2],
    ['醋', '香醋', '陈醋', '米醋'],
    [['勺', 15]],
    'Vinegar, distilled（陈醋 / 香醋另含少量糖与钠）'
  ],
  ['sugar', '白砂糖', '调味品', [387, 0, 100, 0, 0, 1], ['糖', '白糖', '冰糖'], [['勺', 12]], 'Sugars, granulated'],
  ['honey', '蜂蜜', '调味品', [304, 0.3, 82.4, 0, 0.2, 4], ['蜂蜜'], [['勺', 21]], 'Honey'],
  ['ketchup', '番茄酱', '调味品', [101, 1.0, 27.4, 0.1, 0.3, 907], ['番茄沙司', '番茄酱'], [['勺', 17]], 'Catsup'],
  [
    'mayonnaise',
    '蛋黄酱 / 沙拉酱',
    '调味品',
    [680, 1.0, 0.6, 74.9, 0, 635],
    ['沙拉酱', '蛋黄酱', '美乃滋'],
    [['勺', 14]],
    'Salad dressing, mayonnaise, regular'
  ],
  [
    'sesame-paste',
    '芝麻酱',
    '调味品',
    [595, 17.0, 21.2, 53.8, 9.3, 115],
    ['麻酱', '芝麻酱'],
    [['勺', 15]],
    'Seeds, sesame butter, tahini, from roasted and toasted kernels'
  ],
  [
    'hoisin-sauce',
    '甜面酱 / 海鲜酱',
    '调味品',
    [220, 3.3, 44.1, 3.4, 2.8, 1615],
    ['甜面酱', '海鲜酱', '黄酱'],
    [['勺', 16]],
    'Sauce, hoisin, ready-to-serve（甜面酱近似）'
  ],
  [
    'corn-starch',
    '淀粉（玉米淀粉）',
    '调味品',
    [381, 0.3, 91.3, 0.1, 0.9, 9],
    ['淀粉', '生粉', '水淀粉', '玉米淀粉'],
    [['勺', 8]],
    'Cornstarch'
  ],
  [
    'water',
    '水',
    '零食饮料',
    [0, 0, 0, 0, 0, 4],
    ['水', '白开水', '矿泉水'],
    [['杯', 250]],
    'Beverages, water, tap, drinking'
  ],
  // 饮品零食
  [
    'orange-juice',
    '橙汁（100%）',
    '零食饮料',
    [45, 0.7, 10.4, 0.2, 0.2, 1],
    ['橙汁', '果汁'],
    [['杯', 250]],
    'Orange juice, raw'
  ],
  [
    'soy-milk-sweet',
    '豆浆（加糖）',
    '零食饮料',
    [54, 3.3, 6.3, 1.8, 0.6, 51],
    ['甜豆浆'],
    [['杯', 250]],
    'Soymilk, original and vanilla, with added calcium, vitamins A and D'
  ],
  [
    'green-tea',
    '绿茶 / 茶水（无糖）',
    '零食饮料',
    [1, 0.2, 0, 0, 0, 1],
    ['茶', '绿茶', '红茶', '乌龙茶'],
    [['杯', 300]],
    'Beverages, tea, green, brewed, regular'
  ],
  [
    'red-wine',
    '红葡萄酒',
    '零食饮料',
    [85, 0.1, 2.6, 0, 0, 4],
    ['红酒', '葡萄酒'],
    [['杯', 150]],
    'Alcoholic beverage, wine, table, red（热量主要来自酒精）'
  ],
  [
    'french-fries',
    '薯条（快餐）',
    '零食饮料',
    [312, 3.4, 41.4, 14.7, 3.8, 210],
    ['薯条'],
    [['份', 117]],
    'Potatoes, french fried, fast food（近似）'
  ],
  [
    'cream-crackers',
    '饼干（甜，因品牌差异大）',
    '零食饮料',
    [502, 5.0, 64.0, 25.0, 1.6, 350],
    ['曲奇', '甜饼干', '饼干'],
    [['块', 10]],
    'Cookies, butter, commercially prepared（近似）'
  ]
];

// 熟菜 / 主食 / 汤粥：[id, 名称, 分类, 别名, 份量, 熟重系数, [[原料id, 生重g], ...]]
const RECIPES = [
  [
    'tomato-egg',
    '番茄炒蛋',
    '菜肴',
    ['西红柿炒鸡蛋', '番茄炒鸡蛋', '西红柿炒蛋'],
    [
      ['份', 250],
      ['盘', 300]
    ],
    0.85,
    [
      ['tomato', 200],
      ['egg-whole', 100],
      ['veg-oil', 10],
      ['sugar', 3],
      ['salt', 2]
    ]
  ],
  [
    'pepper-pork',
    '青椒肉丝',
    '菜肴',
    ['青椒炒肉', '尖椒肉丝'],
    [['份', 220]],
    0.85,
    [
      ['green-pepper', 150],
      ['pork-tenderloin-raw', 100],
      ['veg-oil', 10],
      ['soy-sauce', 8],
      ['corn-starch', 3],
      ['salt', 1]
    ]
  ],
  [
    'kung-pao-chicken',
    '宫保鸡丁',
    '菜肴',
    ['宫爆鸡丁'],
    [['份', 220]],
    0.85,
    [
      ['chicken-breast-raw', 150],
      ['peanut', 25],
      ['green-pepper', 30],
      ['scallion', 20],
      ['chili-pepper', 5],
      ['veg-oil', 15],
      ['sugar', 8],
      ['soy-sauce', 10],
      ['vinegar', 8],
      ['corn-starch', 5]
    ]
  ],
  [
    'yuxiang-pork',
    '鱼香肉丝',
    '菜肴',
    ['鱼香肉丝'],
    [['份', 220]],
    0.85,
    [
      ['pork-tenderloin-raw', 120],
      ['carrot', 40],
      ['wood-ear', 40],
      ['green-pepper', 40],
      ['veg-oil', 15],
      ['sugar', 10],
      ['vinegar', 10],
      ['soy-sauce', 10],
      ['corn-starch', 5]
    ]
  ],
  [
    'mapo-tofu',
    '麻婆豆腐',
    '菜肴',
    ['麻婆豆腐'],
    [['份', 250]],
    0.9,
    [
      ['tofu-soft', 300],
      ['pork-ground-raw', 50],
      ['veg-oil', 12],
      ['soy-sauce', 10],
      ['chili-pepper', 5],
      ['corn-starch', 5]
    ]
  ],
  [
    'braised-pork-belly',
    '红烧肉',
    '菜肴',
    ['红烧五花肉', '东坡肉'],
    [
      ['份', 150],
      ['块', 25]
    ],
    0.75,
    [
      ['pork-belly-raw', 200],
      ['pork-tenderloin-raw', 100],
      ['sugar', 20],
      ['soy-sauce', 25],
      ['veg-oil', 5]
    ]
  ],
  [
    'sweet-sour-pork',
    '糖醋里脊',
    '菜肴',
    ['糖醋肉', '锅包肉'],
    [['份', 200]],
    0.85,
    [
      ['pork-tenderloin-raw', 200],
      ['corn-starch', 40],
      ['egg-whole', 25],
      ['veg-oil', 30],
      ['sugar', 30],
      ['vinegar', 20],
      ['ketchup', 20]
    ]
  ],
  [
    'twice-cooked-pork',
    '回锅肉',
    '菜肴',
    ['回锅肉'],
    [['份', 200]],
    0.8,
    [
      ['pork-belly-raw', 120],
      ['pork-tenderloin-raw', 80],
      ['green-pepper', 100],
      ['veg-oil', 10],
      ['soy-sauce', 10],
      ['hoisin-sauce', 10]
    ]
  ],
  [
    'di-san-xian',
    '地三鲜',
    '菜肴',
    ['地三鲜'],
    [['份', 250]],
    0.85,
    [
      ['eggplant', 150],
      ['potato-raw', 150],
      ['green-pepper', 80],
      ['veg-oil', 30],
      ['soy-sauce', 10],
      ['sugar', 5],
      ['corn-starch', 5]
    ]
  ],
  [
    'stirfry-broccoli',
    '清炒西兰花',
    '菜肴',
    ['蒜蓉西兰花', '炒西兰花'],
    [['份', 200]],
    0.9,
    [
      ['broccoli', 300],
      ['veg-oil', 10],
      ['garlic', 5],
      ['salt', 2]
    ]
  ],
  [
    'stirfry-lettuce',
    '蚝油生菜',
    '菜肴',
    ['蒜蓉生菜', '炒生菜'],
    [['份', 200]],
    0.8,
    [
      ['lettuce', 300],
      ['oyster-sauce', 15],
      ['veg-oil', 8],
      ['garlic', 5]
    ]
  ],
  [
    'stirfry-bokchoy',
    '清炒小白菜',
    '菜肴',
    ['炒青菜', '清炒上海青', '炒油菜'],
    [['份', 200]],
    0.8,
    [
      ['bok-choy', 300],
      ['veg-oil', 10],
      ['garlic', 5],
      ['salt', 2]
    ]
  ],
  [
    'hot-sour-potato',
    '酸辣土豆丝',
    '菜肴',
    ['土豆丝', '醋溜土豆丝'],
    [['份', 200]],
    0.85,
    [
      ['potato-raw', 300],
      ['veg-oil', 12],
      ['vinegar', 15],
      ['chili-pepper', 5],
      ['salt', 3]
    ]
  ],
  [
    'dry-fried-beans',
    '干煸四季豆',
    '菜肴',
    ['干煸豆角'],
    [['份', 200]],
    0.75,
    [
      ['green-beans', 300],
      ['pork-ground-raw', 40],
      ['veg-oil', 25],
      ['soy-sauce', 8],
      ['chili-pepper', 5]
    ]
  ],
  [
    'shredded-cabbage',
    '手撕包菜',
    '菜肴',
    ['炒包菜', '炝炒圆白菜'],
    [['份', 200]],
    0.85,
    [
      ['cabbage', 300],
      ['veg-oil', 12],
      ['vinegar', 8],
      ['soy-sauce', 8],
      ['chili-pepper', 3]
    ]
  ],
  [
    'tomato-beef',
    '番茄炖牛肉',
    '菜肴',
    ['番茄牛腩', '西红柿炖牛肉'],
    [['份', 250]],
    0.75,
    [
      ['beef-lean-raw', 300],
      ['tomato', 300],
      ['onion', 50],
      ['veg-oil', 10],
      ['sugar', 5],
      ['salt', 4]
    ]
  ],
  [
    'potato-beef',
    '土豆炖牛肉',
    '菜肴',
    ['土豆烧牛肉', '红烧牛肉'],
    [['份', 250]],
    0.8,
    [
      ['beef-lean-raw', 300],
      ['potato-raw', 300],
      ['carrot', 100],
      ['veg-oil', 10],
      ['soy-sauce', 15]
    ]
  ],
  [
    'cola-wings',
    '可乐鸡翅',
    '菜肴',
    ['可乐鸡翅'],
    [
      ['份', 200],
      ['个', 40]
    ],
    0.75,
    [
      ['chicken-wing-raw', 400],
      ['cola', 200],
      ['soy-sauce', 20],
      ['veg-oil', 5]
    ]
  ],
  [
    'huangmen-chicken',
    '黄焖鸡',
    '菜肴',
    ['黄焖鸡', '黄焖鸡块'],
    [['份', 300]],
    0.8,
    [
      ['chicken-thigh-raw', 300],
      ['shiitake-fresh', 60],
      ['green-pepper', 60],
      ['potato-raw', 100],
      ['soy-sauce', 25],
      ['sugar', 8],
      ['veg-oil', 10]
    ]
  ],
  [
    'dapanji',
    '大盘鸡',
    '菜肴',
    ['大盘鸡'],
    [['份', 300]],
    0.85,
    [
      ['chicken-thigh-raw', 300],
      ['potato-raw', 200],
      ['green-pepper', 80],
      ['veg-oil', 20],
      ['soy-sauce', 20],
      ['sugar', 5]
    ]
  ],
  [
    'laziji',
    '辣子鸡',
    '菜肴',
    ['辣子鸡丁'],
    [['份', 200]],
    0.7,
    [
      ['chicken-thigh-raw', 300],
      ['veg-oil', 30],
      ['chili-pepper', 20],
      ['sesame-seeds', 5],
      ['salt', 3]
    ]
  ],
  [
    'boiled-fish',
    '水煮鱼',
    '菜肴',
    ['水煮鱼片'],
    [['份', 300]],
    0.9,
    [
      ['grass-carp', 300],
      ['bean-sprouts', 150],
      ['veg-oil', 40],
      ['chili-pepper', 10],
      ['salt', 4]
    ]
  ],
  [
    'pickled-fish',
    '酸菜鱼',
    '菜肴',
    ['酸菜鱼'],
    [['份', 350]],
    0.9,
    [
      ['grass-carp', 300],
      ['napa-cabbage', 150],
      ['veg-oil', 30],
      ['chili-pepper', 5],
      ['salt', 5]
    ]
  ],
  [
    'steamed-bass',
    '清蒸鲈鱼',
    '菜肴',
    ['清蒸鱼'],
    [['份', 250]],
    0.9,
    [
      ['sea-bass', 400],
      ['scallion', 10],
      ['ginger', 5],
      ['soy-sauce', 15],
      ['veg-oil', 8]
    ]
  ],
  [
    'braised-hairtail',
    '红烧带鱼',
    '菜肴',
    ['红烧带鱼', '干煎带鱼'],
    [['份', 200]],
    0.85,
    [
      ['hairtail', 300],
      ['veg-oil', 20],
      ['soy-sauce', 15],
      ['sugar', 8],
      ['corn-starch', 5]
    ]
  ],
  [
    'braised-prawns',
    '油焖大虾',
    '菜肴',
    ['油焖虾'],
    [['份', 200]],
    0.85,
    [
      ['shrimp', 300],
      ['veg-oil', 15],
      ['sugar', 10],
      ['ketchup', 15],
      ['soy-sauce', 8]
    ]
  ],
  [
    'boiled-shrimp',
    '白灼虾',
    '菜肴',
    ['白灼基围虾', '水煮虾'],
    [['份', 200]],
    0.95,
    [
      ['shrimp', 300],
      ['soy-sauce', 10]
    ]
  ],
  [
    'scallion-lamb',
    '葱爆羊肉',
    '菜肴',
    ['葱爆羊肉'],
    [['份', 200]],
    0.8,
    [
      ['lamb-lean-raw', 250],
      ['scallion', 100],
      ['veg-oil', 12],
      ['soy-sauce', 10]
    ]
  ],
  [
    'jingjiang-pork',
    '京酱肉丝',
    '菜肴',
    ['京酱肉丝'],
    [['份', 200]],
    0.85,
    [
      ['pork-tenderloin-raw', 200],
      ['hoisin-sauce', 25],
      ['sugar', 5],
      ['veg-oil', 15],
      ['scallion', 50]
    ]
  ],
  [
    'moo-shu-pork',
    '木须肉',
    '菜肴',
    ['木樨肉'],
    [['份', 220]],
    0.85,
    [
      ['pork-tenderloin-raw', 120],
      ['egg-whole', 100],
      ['wood-ear', 60],
      ['cucumber', 80],
      ['veg-oil', 15],
      ['soy-sauce', 10]
    ]
  ],
  [
    'yuxiang-eggplant',
    '鱼香茄子',
    '菜肴',
    ['鱼香茄子'],
    [['份', 220]],
    0.8,
    [
      ['eggplant', 300],
      ['pork-ground-raw', 40],
      ['veg-oil', 30],
      ['sugar', 10],
      ['vinegar', 10],
      ['soy-sauce', 10],
      ['corn-starch', 5]
    ]
  ],
  [
    'braised-eggplant',
    '红烧茄子',
    '菜肴',
    ['烧茄子', '蒜蓉茄子'],
    [['份', 220]],
    0.8,
    [
      ['eggplant', 300],
      ['veg-oil', 30],
      ['soy-sauce', 15],
      ['sugar', 8],
      ['garlic', 10]
    ]
  ],
  [
    'home-tofu',
    '家常豆腐',
    '菜肴',
    ['家常豆腐', '红烧豆腐'],
    [['份', 250]],
    0.85,
    [
      ['tofu', 300],
      ['pork-tenderloin-raw', 50],
      ['green-pepper', 50],
      ['veg-oil', 20],
      ['soy-sauce', 10]
    ]
  ],
  [
    'celery-pork',
    '西芹炒肉',
    '菜肴',
    ['芹菜炒肉'],
    [['份', 200]],
    0.85,
    [
      ['celery', 200],
      ['pork-tenderloin-raw', 100],
      ['veg-oil', 12],
      ['soy-sauce', 8]
    ]
  ],
  [
    'onion-beef',
    '洋葱炒牛肉',
    '菜肴',
    ['洋葱牛肉'],
    [['份', 200]],
    0.85,
    [
      ['onion', 150],
      ['beef-lean-raw', 150],
      ['veg-oil', 12],
      ['soy-sauce', 10],
      ['corn-starch', 3]
    ]
  ],
  [
    'black-pepper-beef',
    '黑椒牛柳',
    '菜肴',
    ['黑椒牛肉'],
    [['份', 200]],
    0.85,
    [
      ['beef-lean-raw', 200],
      ['onion', 60],
      ['green-pepper', 60],
      ['veg-oil', 15],
      ['soy-sauce', 10],
      ['sugar', 5],
      ['corn-starch', 5]
    ]
  ],
  [
    'chive-egg',
    '韭菜炒鸡蛋',
    '菜肴',
    ['韭菜炒蛋'],
    [['份', 200]],
    0.9,
    [
      ['chinese-chives', 200],
      ['egg-whole', 100],
      ['veg-oil', 12],
      ['salt', 2]
    ]
  ],
  [
    'bittermelon-egg',
    '苦瓜炒蛋',
    '菜肴',
    ['苦瓜炒鸡蛋'],
    [['份', 200]],
    0.9,
    [
      ['bitter-melon', 200],
      ['egg-whole', 100],
      ['veg-oil', 12],
      ['salt', 2]
    ]
  ],
  [
    'luffa-egg',
    '丝瓜炒蛋',
    '菜肴',
    ['丝瓜炒鸡蛋'],
    [['份', 220]],
    0.9,
    [
      ['luffa', 250],
      ['egg-whole', 100],
      ['veg-oil', 10],
      ['salt', 2]
    ]
  ],
  [
    'shrimp-egg',
    '虾仁炒蛋',
    '菜肴',
    ['滑蛋虾仁'],
    [['份', 200]],
    0.9,
    [
      ['shrimp', 100],
      ['egg-whole', 150],
      ['veg-oil', 12],
      ['salt', 2]
    ]
  ],
  [
    'stirfry-mushroom',
    '清炒口蘑',
    '菜肴',
    ['炒蘑菇', '蘑菇炒肉'],
    [['份', 180]],
    0.75,
    [
      ['white-mushroom', 300],
      ['veg-oil', 12],
      ['soy-sauce', 8],
      ['garlic', 5]
    ]
  ],
  [
    'mushroom-bokchoy',
    '香菇青菜',
    '菜肴',
    ['香菇油菜', '香菇菜心'],
    [['份', 220]],
    0.85,
    [
      ['bok-choy', 250],
      ['shiitake-fresh', 80],
      ['veg-oil', 10],
      ['oyster-sauce', 10]
    ]
  ],
  [
    'garlic-spinach',
    '蒜蓉菠菜',
    '菜肴',
    ['炒菠菜'],
    [['份', 180]],
    0.75,
    [
      ['spinach', 300],
      ['veg-oil', 10],
      ['garlic', 8],
      ['salt', 2]
    ]
  ],
  [
    'stirfry-water-spinach',
    '炒空心菜',
    '菜肴',
    ['蒜蓉空心菜'],
    [['份', 180]],
    0.75,
    [
      ['water-spinach', 300],
      ['veg-oil', 10],
      ['garlic', 8],
      ['salt', 2]
    ]
  ],
  [
    'sweet-sour-ribs',
    '糖醋排骨',
    '菜肴',
    ['糖醋小排'],
    [['份', 200]],
    0.8,
    [
      ['pork-ribs-raw', 300],
      ['sugar', 30],
      ['vinegar', 20],
      ['soy-sauce', 15],
      ['veg-oil', 15]
    ]
  ],
  [
    'braised-ribs',
    '红烧排骨',
    '菜肴',
    ['红烧排骨'],
    [['份', 200]],
    0.8,
    [
      ['pork-ribs-raw', 300],
      ['soy-sauce', 20],
      ['sugar', 10],
      ['veg-oil', 10]
    ]
  ],
  [
    'char-siu',
    '叉烧',
    '菜肴',
    ['叉烧肉', '蜜汁叉烧'],
    [['份', 120]],
    0.7,
    [
      ['pork-tenderloin-raw', 300],
      ['honey', 20],
      ['sugar', 15],
      ['soy-sauce', 20],
      ['hoisin-sauce', 15]
    ]
  ],
  [
    'braised-beef',
    '酱牛肉',
    '菜肴',
    ['卤牛肉', '五香牛肉'],
    [
      ['份', 100],
      ['片', 15]
    ],
    0.6,
    [
      ['beef-lean-raw', 500],
      ['soy-sauce', 30],
      ['sugar', 10]
    ]
  ],
  [
    'tea-egg',
    '茶叶蛋',
    '蛋白质',
    ['卤蛋', '卤鸡蛋'],
    [['个', 50]],
    1.0,
    [
      ['egg-whole', 100],
      ['soy-sauce', 5]
    ]
  ],
  [
    'steamed-egg',
    '鸡蛋羹',
    '菜肴',
    ['蒸蛋', '蒸鸡蛋'],
    [['碗', 200]],
    1.0,
    [
      ['egg-whole', 100],
      ['water', 150],
      ['soy-sauce', 3],
      ['sesame-oil', 2]
    ]
  ],
  [
    'cucumber-salad',
    '凉拌黄瓜',
    '菜肴',
    ['拍黄瓜'],
    [['份', 200]],
    1.0,
    [
      ['cucumber', 300],
      ['garlic', 10],
      ['vinegar', 10],
      ['soy-sauce', 8],
      ['sesame-oil', 5],
      ['salt', 2]
    ]
  ],
  [
    'woodear-salad',
    '凉拌木耳',
    '菜肴',
    ['凉拌黑木耳'],
    [['份', 150]],
    1.0,
    [
      ['wood-ear', 200],
      ['garlic', 5],
      ['vinegar', 10],
      ['soy-sauce', 8],
      ['sesame-oil', 5],
      ['chili-pepper', 3]
    ]
  ],
  [
    'kelp-salad',
    '凉拌海带丝',
    '菜肴',
    ['海带丝'],
    [['份', 150]],
    1.0,
    [
      ['kelp-fresh', 250],
      ['garlic', 5],
      ['vinegar', 10],
      ['soy-sauce', 8],
      ['sesame-oil', 5],
      ['chili-pepper', 2]
    ]
  ],
  [
    'tofu-century-egg',
    '皮蛋豆腐',
    '菜肴',
    ['皮蛋拌豆腐'],
    [['份', 200]],
    1.0,
    [
      ['tofu-soft', 300],
      ['preserved-egg', 60],
      ['soy-sauce', 10],
      ['sesame-oil', 5]
    ]
  ],
  [
    'garlic-scallops',
    '蒜蓉粉丝蒸扇贝',
    '菜肴',
    ['粉丝扇贝', '蒸扇贝'],
    [
      ['份', 200],
      ['个', 40]
    ],
    1.0,
    [
      ['scallop', 200],
      ['cellophane-noodles-dry', 20],
      ['water', 60],
      ['garlic', 15],
      ['veg-oil', 10],
      ['soy-sauce', 8]
    ]
  ],
  [
    'fried-chicken',
    '炸鸡（裹粉）',
    '菜肴',
    ['炸鸡', '炸鸡腿', '炸鸡块'],
    [['块', 100]],
    0.85,
    [
      ['chicken-thigh-raw', 200],
      ['wheat-flour', 30],
      ['veg-oil', 25],
      ['salt', 2]
    ]
  ],
  [
    'spring-roll',
    '春卷（炸）',
    '主食',
    ['春卷'],
    [['个', 40]],
    0.85,
    [
      ['wheat-flour', 40],
      ['cabbage', 60],
      ['carrot', 20],
      ['pork-ground-raw', 20],
      ['veg-oil', 20],
      ['salt', 1]
    ]
  ],
  // 汤粥
  [
    'tomato-egg-soup',
    '番茄蛋汤',
    '汤粥',
    ['西红柿鸡蛋汤', '蛋花汤'],
    [['碗', 300]],
    1.0,
    [
      ['tomato', 150],
      ['egg-whole', 60],
      ['water', 400],
      ['veg-oil', 5],
      ['salt', 3]
    ]
  ],
  [
    'winter-melon-ribs-soup',
    '冬瓜排骨汤',
    '汤粥',
    ['排骨冬瓜汤'],
    [['碗', 350]],
    0.9,
    [
      ['pork-ribs-raw', 200],
      ['winter-melon', 300],
      ['water', 600],
      ['salt', 4]
    ]
  ],
  [
    'corn-ribs-soup',
    '玉米排骨汤',
    '汤粥',
    ['排骨玉米汤'],
    [['碗', 350]],
    0.9,
    [
      ['pork-ribs-raw', 200],
      ['corn-cooked', 150],
      ['carrot', 80],
      ['water', 600],
      ['salt', 4]
    ]
  ],
  [
    'hot-sour-soup',
    '酸辣汤',
    '汤粥',
    ['酸辣汤'],
    [['碗', 300]],
    1.0,
    [
      ['tofu', 80],
      ['egg-whole', 40],
      ['wood-ear', 30],
      ['corn-starch', 15],
      ['vinegar', 20],
      ['soy-sauce', 10],
      ['water', 500]
    ]
  ],
  [
    'fish-tofu-soup',
    '鱼头豆腐汤',
    '汤粥',
    ['鲫鱼豆腐汤', '鱼汤'],
    [['碗', 350]],
    0.9,
    [
      ['carp-raw', 300],
      ['tofu', 200],
      ['water', 600],
      ['veg-oil', 8],
      ['salt', 4]
    ]
  ],
  [
    'borscht',
    '罗宋汤',
    '汤粥',
    ['罗宋汤'],
    [['碗', 350]],
    0.9,
    [
      ['beef-lean-raw', 80],
      ['cabbage', 100],
      ['tomato', 100],
      ['potato-raw', 80],
      ['carrot', 50],
      ['onion', 30],
      ['ketchup', 20],
      ['water', 500],
      ['veg-oil', 8],
      ['salt', 4]
    ]
  ],
  [
    'millet-congee',
    '小米粥',
    '汤粥',
    ['小米粥'],
    [['碗', 300]],
    1.0,
    [
      ['millet-raw', 50],
      ['water', 500]
    ]
  ],
  [
    'century-egg-congee',
    '皮蛋瘦肉粥',
    '汤粥',
    ['皮蛋粥'],
    [['碗', 350]],
    1.0,
    [
      ['rice-raw', 60],
      ['pork-tenderloin-raw', 40],
      ['preserved-egg', 40],
      ['water', 600],
      ['salt', 3]
    ]
  ],
  [
    'eight-treasure-congee',
    '八宝粥',
    '汤粥',
    ['八宝粥', '杂粮粥'],
    [['碗', 300]],
    1.0,
    [
      ['glutinous-rice-raw', 20],
      ['rice-raw', 10],
      ['adzuki-cooked', 30],
      ['peanut', 10],
      ['jujube-dried', 10],
      ['sugar', 10],
      ['water', 400]
    ]
  ],
  [
    'mung-bean-soup',
    '绿豆汤',
    '汤粥',
    ['绿豆沙'],
    [['碗', 300]],
    1.0,
    [
      ['mung-beans-cooked', 100],
      ['sugar', 15],
      ['water', 300]
    ]
  ],
  [
    'red-bean-soup',
    '红豆汤',
    '汤粥',
    ['红豆沙', '红豆粥'],
    [['碗', 300]],
    1.0,
    [
      ['adzuki-cooked', 100],
      ['sugar', 15],
      ['water', 300]
    ]
  ],
  [
    'tofu-pudding',
    '豆腐脑（咸）',
    '汤粥',
    ['豆花', '豆腐花'],
    [['碗', 300]],
    1.0,
    [
      ['tofu-soft', 250],
      ['soy-sauce', 10],
      ['corn-starch', 5],
      ['water', 100],
      ['wood-ear', 10]
    ]
  ],
  // 面点与主食套餐
  [
    'beef-noodle-soup',
    '牛肉面',
    '主食',
    ['兰州拉面', '红烧牛肉面', '牛肉拉面'],
    [['碗', 750]],
    0.95,
    [
      ['noodles-cooked', 300],
      ['beef-lean-raw', 80],
      ['water', 400],
      ['bok-choy', 50],
      ['veg-oil', 8],
      ['soy-sauce', 15],
      ['salt', 3]
    ]
  ],
  [
    'tomato-egg-noodles',
    '番茄鸡蛋面',
    '主食',
    ['西红柿鸡蛋面'],
    [['碗', 600]],
    1.0,
    [
      ['noodles-cooked', 300],
      ['tomato', 150],
      ['egg-whole', 60],
      ['veg-oil', 8],
      ['water', 200],
      ['salt', 3]
    ]
  ],
  [
    'zhajiang-noodles',
    '炸酱面',
    '主食',
    ['老北京炸酱面'],
    [['碗', 450]],
    1.0,
    [
      ['noodles-cooked', 300],
      ['pork-ground-raw', 60],
      ['hoisin-sauce', 25],
      ['cucumber', 40],
      ['veg-oil', 10]
    ]
  ],
  [
    'scallion-oil-noodles',
    '葱油拌面',
    '主食',
    ['葱油面'],
    [['碗', 360]],
    1.0,
    [
      ['noodles-cooked', 300],
      ['veg-oil', 15],
      ['soy-sauce', 20],
      ['sugar', 5],
      ['scallion', 20]
    ]
  ],
  [
    'hot-dry-noodles',
    '热干面',
    '主食',
    ['武汉热干面'],
    [['碗', 350]],
    1.0,
    [
      ['noodles-cooked', 300],
      ['sesame-paste', 30],
      ['soy-sauce', 10],
      ['veg-oil', 5]
    ]
  ],
  [
    'rice-noodle-soup',
    '过桥米线',
    '主食',
    ['米线', '砂锅米线'],
    [['碗', 700]],
    1.0,
    [
      ['rice-noodles-cooked', 300],
      ['pork-tenderloin-raw', 30],
      ['egg-whole', 30],
      ['bok-choy', 50],
      ['water', 300],
      ['veg-oil', 5],
      ['salt', 3]
    ]
  ],
  [
    'hot-sour-glass-noodles',
    '酸辣粉',
    '主食',
    ['酸辣粉'],
    [['碗', 500]],
    1.0,
    [
      ['cellophane-noodles-dry', 60],
      ['water', 400],
      ['peanut', 10],
      ['veg-oil', 10],
      ['vinegar', 15],
      ['soy-sauce', 10],
      ['chili-pepper', 5]
    ]
  ],
  [
    'braised-pork-rice',
    '卤肉饭',
    '主食',
    ['台湾卤肉饭'],
    [['碗', 350]],
    1.0,
    [
      ['rice-cooked', 250],
      ['pork-belly-raw', 60],
      ['soy-sauce', 12],
      ['sugar', 5],
      ['egg-boiled', 25]
    ]
  ],
  [
    'curry-chicken-rice',
    '咖喱鸡饭',
    '主食',
    ['咖喱饭', '咖喱鸡'],
    [['份', 480]],
    1.0,
    [
      ['rice-cooked', 250],
      ['chicken-thigh-raw', 100],
      ['potato-raw', 60],
      ['carrot', 30],
      ['onion', 30],
      ['veg-oil', 10],
      ['wheat-flour', 8],
      ['butter', 5],
      ['salt', 2]
    ]
  ],
  [
    'yuxiang-rice',
    '鱼香肉丝盖饭',
    '主食',
    ['鱼香肉丝饭'],
    [['份', 430]],
    1.0,
    [
      ['rice-cooked', 250],
      ['yuxiang-pork', 180]
    ]
  ],
  [
    'kungpao-rice',
    '宫保鸡丁盖饭',
    '主食',
    ['宫保鸡丁饭'],
    [['份', 430]],
    1.0,
    [
      ['rice-cooked', 250],
      ['kung-pao-chicken', 180]
    ]
  ],
  [
    'tomato-egg-rice',
    '番茄炒蛋盖饭',
    '主食',
    ['番茄炒蛋饭', '西红柿炒蛋盖饭'],
    [['份', 450]],
    1.0,
    [
      ['rice-cooked', 250],
      ['tomato-egg', 200]
    ]
  ],
  [
    'xiaolongbao',
    '小笼包',
    '主食',
    ['汤包', '小笼'],
    [
      ['个', 25],
      ['笼', 200]
    ],
    0.95,
    [
      ['wheat-flour', 100],
      ['water', 50],
      ['pork-ground-raw', 100],
      ['soy-sauce', 8],
      ['sesame-oil', 3],
      ['ginger', 3]
    ]
  ],
  [
    'shaomai',
    '烧卖（糯米）',
    '主食',
    ['烧麦', '糯米烧卖'],
    [['个', 40]],
    1.0,
    [
      ['glutinous-rice-cooked', 100],
      ['pork-ground-raw', 30],
      ['wheat-flour', 25],
      ['soy-sauce', 8],
      ['veg-oil', 5],
      ['shiitake-fresh', 10]
    ]
  ],
  [
    'potstickers',
    '煎饺 / 锅贴',
    '主食',
    ['煎饺', '锅贴'],
    [['个', 25]],
    0.95,
    [
      ['dumpling-pork-cabbage', 200],
      ['veg-oil', 10]
    ]
  ],
  [
    'scallion-pancake',
    '葱油饼',
    '主食',
    ['葱花饼', '葱抓饼', '手抓饼'],
    [['张', 120]],
    0.9,
    [
      ['wheat-flour', 200],
      ['water', 110],
      ['veg-oil', 30],
      ['scallion', 30],
      ['salt', 3]
    ]
  ],
  [
    'egg-pancake',
    '鸡蛋饼',
    '主食',
    ['鸡蛋灌饼', '蛋饼'],
    [['张', 150]],
    0.9,
    [
      ['wheat-flour', 60],
      ['egg-whole', 50],
      ['water', 60],
      ['veg-oil', 8],
      ['scallion', 5],
      ['salt', 1]
    ]
  ],
  [
    'jianbing',
    '煎饼果子',
    '主食',
    ['煎饼'],
    [['个', 220]],
    0.95,
    [
      ['wheat-flour', 40],
      ['mung-beans-cooked', 20],
      ['water', 50],
      ['egg-whole', 50],
      ['youtiao', 30],
      ['hoisin-sauce', 10],
      ['scallion', 5],
      ['veg-oil', 5]
    ]
  ],
  [
    'roujiamo',
    '肉夹馍',
    '主食',
    ['腊汁肉夹馍'],
    [['个', 180]],
    0.85,
    [
      ['wheat-flour', 100],
      ['water', 50],
      ['pork-belly-raw', 70],
      ['soy-sauce', 10],
      ['coriander', 3]
    ]
  ],
  [
    'zongzi-pork',
    '粽子（肉粽）',
    '主食',
    ['肉粽', '粽子'],
    [['个', 150]],
    1.0,
    [
      ['glutinous-rice-raw', 120],
      ['pork-belly-raw', 40],
      ['soy-sauce', 8],
      ['water', 80]
    ]
  ],
  [
    'tangyuan-sesame',
    '汤圆（黑芝麻）',
    '主食',
    ['汤圆', '元宵'],
    [['个', 20]],
    1.0,
    [
      ['glutinous-rice-raw', 60],
      ['water', 40],
      ['sesame-seeds', 15],
      ['sugar', 15],
      ['lard', 8]
    ]
  ],
  [
    'rice-cake',
    '年糕',
    '主食',
    ['年糕', '炒年糕'],
    [['片', 20]],
    1.0,
    [
      ['rice-flour', 50],
      ['water', 50]
    ]
  ],
  [
    'tuna-rice-ball',
    '金枪鱼饭团',
    '主食',
    ['饭团'],
    [['个', 110]],
    1.0,
    [
      ['rice-cooked', 150],
      ['tuna-canned', 30],
      ['mayonnaise', 5],
      ['soy-sauce', 2]
    ]
  ],
  [
    'ham-egg-sandwich',
    '火腿鸡蛋三明治',
    '主食',
    ['三明治'],
    [['个', 160]],
    1.0,
    [
      ['white-bread', 60],
      ['ham-sliced', 30],
      ['egg-fried', 46],
      ['lettuce', 15],
      ['mayonnaise', 8]
    ]
  ],
  [
    'oats-milk',
    '燕麦牛奶',
    '主食',
    ['牛奶燕麦', '燕麦片加牛奶'],
    [['碗', 290]],
    1.0,
    [
      ['oats-dry', 40],
      ['milk-whole', 250]
    ]
  ],
  // 轻食
  [
    'veg-salad',
    '蔬菜沙拉（油醋汁）',
    '菜肴',
    ['蔬菜沙拉', '沙拉'],
    [['份', 230]],
    1.0,
    [
      ['lettuce', 100],
      ['tomato', 50],
      ['cucumber', 50],
      ['carrot', 20],
      ['olive-oil', 8],
      ['vinegar', 8]
    ]
  ],
  [
    'chicken-salad',
    '鸡胸肉沙拉',
    '菜肴',
    ['鸡肉沙拉', '轻食沙拉'],
    [['份', 330]],
    1.0,
    [
      ['chicken-breast-cooked', 100],
      ['lettuce', 100],
      ['tomato', 50],
      ['cucumber', 50],
      ['carrot', 20],
      ['olive-oil', 8],
      ['vinegar', 8]
    ]
  ],
  [
    'fruit-yogurt',
    '酸奶水果杯',
    '零食饮料',
    ['水果捞', '水果酸奶'],
    [['杯', 250]],
    1.0,
    [
      ['apple', 80],
      ['banana', 60],
      ['grape', 50],
      ['yogurt-plain', 60]
    ]
  ]
];

const r1 = (x) => Math.round(x * 10) / 10;
const legacy = db.foods.filter((f) => !BASE.some((b) => b[0] === f.id) && !RECIPES.some((r) => r[0] === f.id));
const LEGACY_DISH = new Set([
  'mantou',
  'hua-juan',
  'dumpling-pork-cabbage',
  'baozi-pork',
  'wonton-pork',
  'fried-rice',
  'fried-noodles',
  'congee',
  'youtiao',
  'milk-tea',
  'latte'
]);
legacy.forEach((f) => {
  if (!f.ref)
    f.ref = LEGACY_DISH.has(f.id)
      ? '自整理估算（v2.1，按常见配方与 USDA FoodData Central 原料值估算）'
      : '参考 USDA FoodData Central 同类条目（v2.1 自整理近似值）';
});
const out = legacy.slice();
const byId = new Map(out.map((f) => [f.id, f]));
const serv = (arr) => arr.map(([unit, g]) => ({ unit, g, label: '1' + unit + '≈' + g + 'g' }));
for (const [id, name, category, v, aliases, sv, ref] of BASE) {
  const f = { id, name, category, kcal: v[0], p: v[1], c: v[2], f: v[3] };
  if (v[4] != null) f.fib = v[4];
  if (v[5] != null) f.na = v[5];
  f.aliases = aliases;
  if (sv.length) f.servings = serv(sv);
  f.source = SRC_USDA;
  f.ref = U(ref);
  out.push(f);
  byId.set(id, f);
}
for (const [id, name, category, aliases, sv, yieldF, parts] of RECIPES) {
  const t = { kcal: 0, p: 0, c: 0, f: 0, fib: 0, na: 0 };
  let w = 0,
    fibOk = true,
    naOk = true;
  for (const [iid, g] of parts) {
    const ing = byId.get(iid);
    if (!ing) throw new Error(`${id}: 未知原料 ${iid}`);
    for (const k of ['kcal', 'p', 'c', 'f']) t[k] += (ing[k] * g) / 100;
    if (ing.fib == null) fibOk = false;
    else t.fib += (ing.fib * g) / 100;
    if (ing.na == null) naOk = false;
    else t.na += (ing.na * g) / 100;
    w += g;
  }
  const cooked = w * yieldF,
    k = 100 / cooked;
  const f = { id, name, category, kcal: Math.round(t.kcal * k), p: r1(t.p * k), c: r1(t.c * k), f: r1(t.f * k) };
  if (fibOk) f.fib = r1(t.fib * k);
  if (naOk) f.na = Math.round(t.na * k);
  f.aliases = aliases;
  f.servings = serv(sv);
  f.source = SRC_RECIPE;
  const nm = (iid) =>
    byId
      .get(iid)
      .name.replace(/[（(].*?[）)]/g, '')
      .split(' / ')[0];
  f.ref =
    '自拟配方（生重）：' +
    parts.map(([iid, g]) => nm(iid) + ' ' + g + 'g').join('、') +
    (yieldF !== 1 ? '；熟重按生重 ' + Math.round(yieldF * 100) + '% 计' : '') +
    '；原料值见库内对应条目';
  out.push(f);
  byId.set(id, f);
}
const ids = new Set();
for (const f of out) {
  if (ids.has(f.id)) throw new Error('重复 id ' + f.id);
  ids.add(f.id);
}
const names = new Set();
for (const f of out) {
  if (names.has(f.name)) throw new Error('重复名称 ' + f.name);
  names.add(f.name);
}
db.version = 4;
db.note =
  '常见食物每100g可食部的近似营养值：kcal、蛋白质 p、碳水 c、脂肪 f（g），可选 膳食纤维 fib（g）、钠 mg（na），缺省表示未提供。原料数值为本项目自整理的近似值，参考 USDA FoodData Central（公有领域 / CC0），ref 字段注明所参考的 USDA 条目；熟菜、面点与汤粥按本项目自拟配方由库内原料计算，ref 字段写明配方与熟重系数。不复制任何第三方食物成分表或数据集。仅供估算，实际以包装营养成分表为准，不构成营养或医疗建议。servings 为常用份量换算；source 标注数据来源类型。';
db.foods = out;
fs.writeFileSync(FILE, JSON.stringify(db, null, 1) + '\n');
console.log(
  `[ok] data/foods.json：${out.length} 项（原有 ${legacy.length}，原料 ${BASE.length}，配方 ${RECIPES.length}）`
);
