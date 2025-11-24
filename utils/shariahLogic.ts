import { Party, Relation } from '../types';

export const calculateShares = (parties: Party[]): Party[] => {
  // This is a SIMPLIFIED calculator for common scenarios.
  // Full Faraid logic is extremely complex.
  
  const newParties = parties.map(p => ({...p, shariahSharePercentage: 0}));
  
  // 1. Identify Spouses
  const wife = newParties.find(p => p.relation === Relation.WIFE);
  const husband = newParties.find(p => p.relation === Relation.HUSBAND);
  const sons = newParties.filter(p => p.relation === Relation.SON);
  const daughters = newParties.filter(p => p.relation === Relation.DAUGHTER);
  const father = newParties.find(p => p.relation === Relation.FATHER);
  const mother = newParties.find(p => p.relation === Relation.MOTHER);

  const hasChildren = sons.length > 0 || daughters.length > 0;
  
  let remainingShare = 1.0;

  // Spouse Shares
  if (husband) {
     const share = hasChildren ? 0.25 : 0.5;
     husband.shariahSharePercentage = share * 100;
     remainingShare -= share;
  } else if (wife) {
     // Note: If multiple wives, they share this 1/8 or 1/4. Assuming single wife for this MVP or aggregating.
     const share = hasChildren ? 0.125 : 0.25;
     wife.shariahSharePercentage = share * 100;
     remainingShare -= share;
  }

  // Parents Shares
  if (father) {
      // Simplification: Father gets 1/6 guaranteed if children exist.
      // If no children, he is residuary, but let's stick to basic fixed for now + residue later.
      const share = 1/6;
      father.shariahSharePercentage = share * 100;
      remainingShare -= share;
  }
  if (mother) {
      const share = hasChildren ? 1/6 : 1/3; // Simplified
      mother.shariahSharePercentage = share * 100;
      remainingShare -= share;
  }

  // Children (Residuary)
  if (remainingShare > 0 && (sons.length > 0 || daughters.length > 0)) {
      const totalUnits = (sons.length * 2) + daughters.length;
      const unitValue = remainingShare / totalUnits;

      sons.forEach(son => {
          son.shariahSharePercentage = (unitValue * 2) * 100;
      });
      daughters.forEach(daughter => {
          daughter.shariahSharePercentage = unitValue * 100;
      });
  } else if (remainingShare > 0 && father) {
      // Father takes rest if no children
      father.shariahSharePercentage += (remainingShare * 100);
  }

  return newParties;
};