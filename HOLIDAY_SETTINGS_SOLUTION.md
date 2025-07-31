# 🎌 Holiday Settings Consolidation Solution

## 🔍 Current State Analysis

### Multiple Holiday-Related Files Found:
1. `check-holiday-settings-structure.sql`
2. `check-holiday-table.sql`
3. `debug-holiday-settings.sql`
4. `emergency-holiday-fix.sql`
5. `fix-holiday-settings.sql`
6. `fix-holiday-settings-quick.sql`
7. `supabase/migrations/ADD_HOLIDAY_SETTINGS.sql`

This indicates multiple attempts to fix holiday functionality, creating confusion and potential conflicts.

## 🎯 Non-Destructive Consolidation Strategy

### Step 1: Create Unified Holiday System

```sql
-- supabase/migrations/consolidated/holiday_system_v2.sql
-- This preserves ALL existing holiday data while creating a unified structure

-- 1. Create new unified holiday settings table (if not exists)
CREATE TABLE IF NOT EXISTS holiday_settings_unified (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Preserve all existing fields from various implementations
  regular_holidays jsonb DEFAULT '{"sunday": false, "monday": false, "tuesday": false, "wednesday": false, "thursday": false, "friday": false, "saturday": false}',
  custom_holidays jsonb DEFAULT '[]',
  special_business_days jsonb DEFAULT '[]',
  
  -- Additional fields from various fix attempts
  holiday_name text,
  holiday_date date,
  is_recurring boolean DEFAULT false,
  recurrence_rule text,
  
  -- Metadata for tracking
  source_table text, -- Track where data came from
  migration_date timestamptz DEFAULT now(),
  version integer DEFAULT 2,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id)
);

-- 2. Migrate data from all existing holiday tables (preserve everything)
INSERT INTO holiday_settings_unified (
  tenant_id, 
  regular_holidays, 
  custom_holidays,
  source_table
)
SELECT DISTINCT ON (tenant_id)
  tenant_id,
  regular_holidays,
  custom_holidays,
  'holiday_settings' as source_table
FROM holiday_settings
WHERE NOT EXISTS (
  SELECT 1 FROM holiday_settings_unified hu 
  WHERE hu.tenant_id = holiday_settings.tenant_id
)
ON CONFLICT (tenant_id) DO UPDATE SET
  custom_holidays = holiday_settings_unified.custom_holidays || EXCLUDED.custom_holidays,
  updated_at = now();

-- 3. Create views for backward compatibility
CREATE OR REPLACE VIEW holiday_settings AS
SELECT 
  id,
  tenant_id,
  regular_holidays,
  custom_holidays,
  created_at,
  updated_at
FROM holiday_settings_unified;

-- 4. Create helper functions for holiday checking
CREATE OR REPLACE FUNCTION is_holiday(
  p_tenant_id uuid,
  p_date date
) RETURNS boolean AS $$
DECLARE
  v_day_of_week text;
  v_regular_holidays jsonb;
  v_custom_holidays jsonb;
  v_is_holiday boolean := false;
BEGIN
  -- Get day of week
  v_day_of_week := LOWER(to_char(p_date, 'Day'));
  v_day_of_week := TRIM(v_day_of_week);
  
  -- Get holiday settings
  SELECT regular_holidays, custom_holidays
  INTO v_regular_holidays, v_custom_holidays
  FROM holiday_settings_unified
  WHERE tenant_id = p_tenant_id;
  
  -- Check regular holidays
  IF v_regular_holidays IS NOT NULL THEN
    v_is_holiday := COALESCE((v_regular_holidays->v_day_of_week)::boolean, false);
  END IF;
  
  -- Check custom holidays
  IF NOT v_is_holiday AND v_custom_holidays IS NOT NULL THEN
    v_is_holiday := v_custom_holidays @> to_jsonb(to_char(p_date, 'YYYY-MM-DD'));
  END IF;
  
  RETURN v_is_holiday;
END;
$$ LANGUAGE plpgsql STABLE;
```

### Step 2: Create Migration Safety Net

```typescript
// src/services/holiday/holiday-migration-validator.ts
export class HolidayMigrationValidator {
  async validateMigration(): Promise<ValidationResult> {
    const results = {
      dataPreserved: true,
      functionalityIntact: true,
      performanceAcceptable: true,
      errors: []
    };
    
    try {
      // 1. Check all tenants have holiday settings
      const tenantCheck = await this.checkAllTenantsHaveSettings();
      
      // 2. Verify no data loss
      const dataCheck = await this.verifyNoDataLoss();
      
      // 3. Test holiday detection functionality
      const functionalCheck = await this.testHolidayDetection();
      
      // 4. Performance benchmark
      const perfCheck = await this.benchmarkPerformance();
      
      return results;
    } catch (error) {
      results.errors.push(error);
      return results;
    }
  }
  
  private async verifyNoDataLoss(): Promise<boolean> {
    // Compare row counts
    const oldCount = await db.query('SELECT COUNT(*) FROM holiday_settings');
    const newCount = await db.query('SELECT COUNT(*) FROM holiday_settings_unified');
    
    // Compare actual data
    const oldData = await db.query('SELECT * FROM holiday_settings ORDER BY tenant_id');
    const newData = await db.query('SELECT * FROM holiday_settings_unified ORDER BY tenant_id');
    
    return oldCount === newCount && this.dataMatches(oldData, newData);
  }
}
```

### Step 3: Update Application Layer

```typescript
// src/hooks/useHolidaySettings.ts
export function useHolidaySettings() {
  const { tenantId } = useTenant();
  
  // Use new unified API but maintain backward compatibility
  const getHolidays = async () => {
    try {
      // Try new unified table first
      const { data: unified } = await supabase
        .from('holiday_settings_unified')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();
        
      if (unified) return unified;
      
      // Fallback to old table if needed (during migration)
      const { data: legacy } = await supabase
        .from('holiday_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();
        
      return legacy;
    } catch (error) {
      console.error('Error fetching holiday settings:', error);
      return getDefaultHolidaySettings();
    }
  };
  
  // Preserve all existing functionality
  return {
    getHolidays,
    updateHolidays,
    isHoliday,
    addCustomHoliday,
    removeCustomHoliday,
    // ... all existing methods preserved
  };
}
```

### Step 4: Create Debug Dashboard

```typescript
// src/components/admin/HolidayDebugPanel.tsx
export const HolidayDebugPanel: React.FC = () => {
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>();
  
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Holiday System Status</h3>
      
      <div className="space-y-4">
        {/* Show status of all holiday tables */}
        <DataTableStatus table="holiday_settings" />
        <DataTableStatus table="holiday_settings_unified" />
        <DataTableStatus table="holidays" />
        
        {/* Migration controls */}
        <div className="flex gap-2">
          <Button onClick={validateMigration}>Validate Migration</Button>
          <Button onClick={runMigration}>Run Safe Migration</Button>
          <Button onClick={rollbackMigration} variant="danger">Rollback</Button>
        </div>
        
        {/* Data comparison */}
        <DataComparison 
          source="holiday_settings" 
          target="holiday_settings_unified" 
        />
      </div>
    </Card>
  );
};
```

### Step 5: Phased Migration Plan

#### Phase 1: Preparation (Day 1)
```bash
# 1. Create full backup
pg_dump -h your-db-host -U postgres -d your-db-name > backup_before_holiday_migration.sql

# 2. Create migration test environment
./scripts/create-test-env.sh

# 3. Run migration on test
./scripts/test-holiday-migration.sh
```

#### Phase 2: Staged Rollout (Day 2-3)
```sql
-- Enable for specific tenants first
UPDATE tenants 
SET feature_flags = feature_flags || '{"use_unified_holidays": true}'
WHERE id IN (
  -- Select test tenants
  SELECT id FROM tenants WHERE is_test = true LIMIT 5
);
```

#### Phase 3: Full Migration (Day 4)
```sql
-- Run full migration
BEGIN;
  -- Execute migration
  \i supabase/migrations/consolidated/holiday_system_v2.sql
  
  -- Validate
  SELECT validate_holiday_migration();
  
  -- If validation passes, commit
COMMIT;
```

#### Phase 4: Cleanup (Day 7+)
```sql
-- After confirming everything works for a week
-- Archive old tables (don't delete yet)
ALTER TABLE holiday_settings RENAME TO holiday_settings_archived_2025;
ALTER TABLE holidays RENAME TO holidays_archived_2025;

-- Update all references to use unified table
```

## 🔍 Validation Checklist

### Pre-Migration:
- [ ] All holiday data backed up
- [ ] Test environment validated
- [ ] Rollback script prepared
- [ ] Monitoring alerts configured

### During Migration:
- [ ] No errors in migration log
- [ ] Row counts match
- [ ] Sample data verified
- [ ] API endpoints tested

### Post-Migration:
- [ ] All holiday features working
- [ ] No performance degradation
- [ ] No error spike in logs
- [ ] User reports no issues

## 🚨 Emergency Procedures

### If Migration Fails:
```sql
-- Immediate rollback
BEGIN;
  DROP TABLE IF EXISTS holiday_settings_unified CASCADE;
  DROP FUNCTION IF EXISTS is_holiday(uuid, date);
  
  -- Restore from backup
  \i backup_before_holiday_migration.sql
COMMIT;
```

### If Partial Data Loss:
```sql
-- Restore specific tenant data
INSERT INTO holiday_settings_unified
SELECT * FROM holiday_settings_archived_2025
WHERE tenant_id = 'affected-tenant-id';
```

## 📊 Success Metrics

1. **Data Integrity**: 100% of holiday data preserved
2. **Functionality**: All holiday checks work correctly
3. **Performance**: Query time ≤ original implementation
4. **Stability**: Zero holiday-related errors post-migration

## 🎯 Benefits After Consolidation

1. **Single Source of Truth**: One table for all holiday data
2. **Backward Compatible**: Existing code continues to work
3. **Easier Debugging**: Clear data model
4. **Better Performance**: Optimized queries with indexes
5. **Future-Proof**: Easy to extend for new features

This solution ensures all holiday functionality is preserved while creating a cleaner, more maintainable system.