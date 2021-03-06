import { getSafe, pushSafe } from '../../../util/storeHelper';

import { IMod } from '../../mod_management/types/IMod';
import { ICategory } from '../types/ICategoryDictionary';
import { ICategoriesTree } from '../types/ITrees';
import generateSubtitle from './generateSubtitle';

import * as I18next from 'i18next';

function searchChildren(t: I18next.TranslationFunction,
                        categories: { [categoryId: string]: ICategory },
                        rootId: string,
                        mods: { [categoryId: string]: IMod[] }) {
  const children = Object.keys(categories)
  .filter(id => rootId === categories[id].parentCategory)
  .sort((lhs: string, rhs: string) => (categories[lhs].order - categories[rhs].order));

  const childrenList = [];

  children.forEach(childId => {
    const modCount = getSafe(mods, [childId], []).length;
    const subt: string = mods !== undefined ? generateSubtitle(t, childId, mods) : '';
    const child: ICategoriesTree = {
      categoryId: childId,
      title: categories[childId].name,
      subtitle: subt,
      expanded: false,
      modCount,
      parentId: categories[childId].parentCategory,
      order: categories[childId].order,
      children: searchChildren(t, categories, childId, mods),
    };
    childrenList.push(child);
  });

  return childrenList;
}

/**
 * create the treeDataObject from the categories inside the store
 *
 * @param {Object} categories
 * @param {any} mods
 * @return {[]} categoryList
 *
 */

function createTreeDataObject(t: I18next.TranslationFunction,
                              categories: { [categoryId: string]: ICategory },
                              mods: {[modId: string]: IMod}): ICategoriesTree[] {
  const categoryList: ICategoriesTree[] = [];

  const modsByCategory = Object.keys(mods || {}).reduce(
      (prev: {[categoryId: string]: IMod[]}, current: string) => {
        const category = getSafe(mods, [current, 'attributes', 'category'], undefined);
        if (category === undefined) {
          return prev;
        }
        return pushSafe(prev, [ category ], current);
      },
      {});

  const roots = Object.keys(categories)
          .filter((id: string) => (categories[id].parentCategory === undefined))
          .sort((lhs, rhs) => (categories[lhs].order - categories[rhs].order));

  roots.forEach(rootElement => {
    const children = Object.keys(categories)
    .filter((id: string) => (rootElement === categories[id].parentCategory))
    .sort((lhs, rhs) => (categories[lhs].order - categories[rhs].order));

    const childrenList = [];

    children.forEach(element => {
      const subtitle: string = generateSubtitle(t, element, modsByCategory);
      const modCount = getSafe(modsByCategory, [element], []).length;
      const child: ICategoriesTree = {
        categoryId: element,
        title: categories[element].name,
        subtitle,
        expanded: false,
        modCount,
        parentId: categories[element].parentCategory,
        order: categories[element].order,
        children: searchChildren(t, categories, element, modsByCategory),
      };
      childrenList.push(child);
    });

    categoryList.push({
      categoryId: rootElement,
      title: categories[rootElement].name,
      subtitle: generateSubtitle(t, rootElement, modsByCategory),
      expanded: false,
      parentId: undefined,
      modCount: getSafe(modsByCategory, [rootElement], []).length,
      children: childrenList,
      order: categories[rootElement].order,
    });
  });

  return categoryList;
}

export default createTreeDataObject;
