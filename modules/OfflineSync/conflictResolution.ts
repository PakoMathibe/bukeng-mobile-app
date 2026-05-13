// modules/OfflineSync/conflictResolution.ts
export interface ConflictData {
  localVersion: any;
  remoteVersion: any;
  localTimestamp: number;
  remoteTimestamp: number;
}

export type ResolutionStrategy =
  | 'local-wins'
  | 'remote-wins'
  | 'last-write-wins'
  | 'merge';

export class ConflictResolver {
  static resolve(
    localData: any,
    remoteData: any,
    localTimestamp: number,
    remoteTimestamp: number,
    strategy: ResolutionStrategy = 'last-write-wins'
  ): any {
    switch (strategy) {
      case 'local-wins':
        return localData;
      case 'remote-wins':
        return remoteData;
      case 'last-write-wins':
        return localTimestamp > remoteTimestamp ? localData : remoteData;
      case 'merge':
        return this.merge(localData, remoteData);
      default:
        return remoteData;
    }
  }

  static detectConflicts(localData: any, remoteData: any): string[] {
    const conflicts: string[] = [];
    const allKeys = new Set([
      ...Object.keys(localData),
      ...Object.keys(remoteData),
    ]);

    for (const key of allKeys) {
      if (JSON.stringify(localData[key]) !== JSON.stringify(remoteData[key])) {
        conflicts.push(key);
      }
    }

    return conflicts;
  }

  private static merge(localData: any, remoteData: any): any {
    const merged = { ...remoteData };
    const conflicts = this.detectConflicts(localData, remoteData);

    for (const field of conflicts) {
      // For credit-related fields, take the higher value (more conservative)
      if (field === 'available_credit' || field === 'credit_limit') {
        merged[field] = Math.min(localData[field], remoteData[field]);
      }
      // For status fields, take the more advanced state
      else if (field === 'status') {
        const statusPriority = {
          pending: 1,
          processing: 2,
          completed: 3,
          failed: 4,
        };
        merged[field] =
          statusPriority[localData[field]] > statusPriority[remoteData[field]]
            ? localData[field]
            : remoteData[field];
      }
      // For other fields, prefer remote
      else {
        merged[field] = remoteData[field];
      }
    }

    return merged;
  }
}
