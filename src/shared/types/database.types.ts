export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      active_matches: {
        Row: {
          bot_difficulty: string | null
          cooldown_multiplier: number
          created_at: string
          current_turn_player_id: string | null
          current_turn_slot: number
          economy_multiplier: number
          end_reason: string | null
          game_mode: string
          id: string
          is_overtime: boolean
          is_ranked: boolean
          map_id: string
          match_format: string
          max_turns_limit: number
          network_mode: string
          overtime_started_at_turn: number | null
          player1_id: string
          player2_id: string | null
          resigned_player_id: string | null
          rng_counter: number
          rng_seed: string
          room_code: string
          status: string
          sudden_death_first_blood_player_id: string | null
          tournament_level_cap: number | null
          turn_deadline: string | null
          turn_number: number
          turn_time_limit_sec: number
          unit_population_cap: number
          updated_at: string
          winner_id: string | null
          winning_team: string | null
        }
        Insert: {
          bot_difficulty?: string | null
          cooldown_multiplier?: number
          created_at?: string
          current_turn_player_id?: string | null
          current_turn_slot?: number
          economy_multiplier?: number
          end_reason?: string | null
          game_mode?: string
          id?: string
          is_overtime?: boolean
          is_ranked?: boolean
          map_id?: string
          match_format?: string
          max_turns_limit?: number
          network_mode?: string
          overtime_started_at_turn?: number | null
          player1_id: string
          player2_id?: string | null
          resigned_player_id?: string | null
          rng_counter?: number
          rng_seed?: string
          room_code: string
          status?: string
          sudden_death_first_blood_player_id?: string | null
          tournament_level_cap?: number | null
          turn_deadline?: string | null
          turn_number?: number
          turn_time_limit_sec?: number
          unit_population_cap?: number
          updated_at?: string
          winner_id?: string | null
          winning_team?: string | null
        }
        Update: {
          bot_difficulty?: string | null
          cooldown_multiplier?: number
          created_at?: string
          current_turn_player_id?: string | null
          current_turn_slot?: number
          economy_multiplier?: number
          end_reason?: string | null
          game_mode?: string
          id?: string
          is_overtime?: boolean
          is_ranked?: boolean
          map_id?: string
          match_format?: string
          max_turns_limit?: number
          network_mode?: string
          overtime_started_at_turn?: number | null
          player1_id?: string
          player2_id?: string | null
          resigned_player_id?: string | null
          rng_counter?: number
          rng_seed?: string
          room_code?: string
          status?: string
          sudden_death_first_blood_player_id?: string | null
          tournament_level_cap?: number | null
          turn_deadline?: string | null
          turn_number?: number
          turn_time_limit_sec?: number
          unit_population_cap?: number
          updated_at?: string
          winner_id?: string | null
          winning_team?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "active_matches_current_turn_player_id_fkey"
            columns: ["current_turn_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_matches_resigned_player_id_fkey"
            columns: ["resigned_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_matches_sudden_death_first_blood_player_id_fkey"
            columns: ["sudden_death_first_blood_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bark_dialogue_templates: {
        Row: {
          affinity_level_min: number
          bubble_shape: string
          comic_vignette_pose: string
          commander_id: string
          cooldown_turns: number
          created_at: string
          dialogue_template_text: string
          id: string
          min_bonding_level: number
          onomatopoeia_stamp: string | null
          priority_weight: number
          required_condition_json: Json
          trigger_context: string | null
          trigger_phase: string
          trigger_situation: string | null
        }
        Insert: {
          affinity_level_min?: number
          bubble_shape?: string
          comic_vignette_pose?: string
          commander_id: string
          cooldown_turns?: number
          created_at?: string
          dialogue_template_text: string
          id: string
          min_bonding_level?: number
          onomatopoeia_stamp?: string | null
          priority_weight?: number
          required_condition_json?: Json
          trigger_context?: string | null
          trigger_phase?: string
          trigger_situation?: string | null
        }
        Update: {
          affinity_level_min?: number
          bubble_shape?: string
          comic_vignette_pose?: string
          commander_id?: string
          cooldown_turns?: number
          created_at?: string
          dialogue_template_text?: string
          id?: string
          min_bonding_level?: number
          onomatopoeia_stamp?: string | null
          priority_weight?: number
          required_condition_json?: Json
          trigger_context?: string | null
          trigger_phase?: string
          trigger_situation?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          channel_id: string
          channel_type: string
          created_at: string
          id: string
          message_text: string
          message_type: string
          metadata: Json
          recipient_id: string | null
          sender_id: string
          stamp_id: string | null
        }
        Insert: {
          channel_id: string
          channel_type: string
          created_at?: string
          id?: string
          message_text: string
          message_type?: string
          metadata?: Json
          recipient_id?: string | null
          sender_id: string
          stamp_id?: string | null
        }
        Update: {
          channel_id?: string
          channel_type?: string
          created_at?: string
          id?: string
          message_text?: string
          message_type?: string
          metadata?: Json
          recipient_id?: string | null
          sender_id?: string
          stamp_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_moderation_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          message_id: string | null
          reason: string
          reported_user_id: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          message_id?: string | null
          reason: string
          reported_user_id: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          message_id?: string | null
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_moderation_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_moderation_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_moderation_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_card_donations: {
        Row: {
          amount: number
          donated_at: string | null
          donor_id: string
          gold_reward: number
          id: string
          request_id: string
          xp_reward: number
        }
        Insert: {
          amount: number
          donated_at?: string | null
          donor_id: string
          gold_reward?: number
          id?: string
          request_id: string
          xp_reward?: number
        }
        Update: {
          amount?: number
          donated_at?: string | null
          donor_id?: string
          gold_reward?: number
          id?: string
          request_id?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "clan_card_donations_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_card_donations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "clan_card_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_card_requests: {
        Row: {
          amount_donated: number
          amount_requested: number
          card_id: string
          clan_id: string
          created_at: string | null
          expires_at: string
          id: string
          is_fulfilled: boolean | null
          rarity: string
          requester_id: string
        }
        Insert: {
          amount_donated?: number
          amount_requested: number
          card_id: string
          clan_id: string
          created_at?: string | null
          expires_at: string
          id?: string
          is_fulfilled?: boolean | null
          rarity: string
          requester_id: string
        }
        Update: {
          amount_donated?: number
          amount_requested?: number
          card_id?: string
          clan_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          is_fulfilled?: boolean | null
          rarity?: string
          requester_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_card_requests_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_card_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_members: {
        Row: {
          clan_id: string
          daily_war_matches_played: number
          daily_war_victories: number
          donated_cards_weekly: number
          has_claimed_daily_chest: boolean
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          clan_id: string
          daily_war_matches_played?: number
          daily_war_victories?: number
          donated_cards_weekly?: number
          has_claimed_daily_chest?: boolean
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          clan_id?: string
          daily_war_matches_played?: number
          daily_war_victories?: number
          donated_cards_weekly?: number
          has_claimed_daily_chest?: boolean
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_members_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_territory_sectors: {
        Row: {
          current_controlling_clan_id: string | null
          description: string | null
          name: string
          sector_id: number
          strategic_buff_type: string
          updated_at: string | null
        }
        Insert: {
          current_controlling_clan_id?: string | null
          description?: string | null
          name: string
          sector_id: number
          strategic_buff_type: string
          updated_at?: string | null
        }
        Update: {
          current_controlling_clan_id?: string | null
          description?: string | null
          name?: string
          sector_id?: number
          strategic_buff_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clan_territory_sectors_current_controlling_clan_id_fkey"
            columns: ["current_controlling_clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_war_deployments: {
        Row: {
          battle_type: string
          clan_id: string
          deployed_at: string | null
          deployment_points: number
          id: string
          season_id: string
          sector_id: number
          user_id: string
        }
        Insert: {
          battle_type: string
          clan_id: string
          deployed_at?: string | null
          deployment_points: number
          id?: string
          season_id: string
          sector_id: number
          user_id: string
        }
        Update: {
          battle_type?: string
          clan_id?: string
          deployed_at?: string | null
          deployment_points?: number
          id?: string
          season_id?: string
          sector_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_war_deployments_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_war_deployments_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "clan_war_seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_war_deployments_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "clan_territory_sectors"
            referencedColumns: ["sector_id"]
          },
          {
            foreignKeyName: "clan_war_deployments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_war_seasons: {
        Row: {
          created_at: string | null
          ends_at: string
          id: string
          is_active: boolean | null
          season_number: number
          starts_at: string
        }
        Insert: {
          created_at?: string | null
          ends_at: string
          id?: string
          is_active?: boolean | null
          season_number: number
          starts_at: string
        }
        Update: {
          created_at?: string | null
          ends_at?: string
          id?: string
          is_active?: boolean | null
          season_number?: number
          starts_at?: string
        }
        Relationships: []
      }
      clans: {
        Row: {
          active_war_buffs: Json | null
          active_war_participants_today: number
          badge_icon: string
          banner_color: string | null
          clan_banner_cosmetic_id: string | null
          created_at: string
          current_war_tier: number
          description: string | null
          emblem_id: string | null
          id: string
          leader_id: string
          members_count: number
          name: string
          required_trophies: number
          tag: string
          total_trophies: number
          treasury_gems: number | null
          treasury_gold: number
          treasury_steel: number
          updated_at: string
        }
        Insert: {
          active_war_buffs?: Json | null
          active_war_participants_today?: number
          badge_icon?: string
          banner_color?: string | null
          clan_banner_cosmetic_id?: string | null
          created_at?: string
          current_war_tier?: number
          description?: string | null
          emblem_id?: string | null
          id?: string
          leader_id: string
          members_count?: number
          name: string
          required_trophies?: number
          tag: string
          total_trophies?: number
          treasury_gems?: number | null
          treasury_gold?: number
          treasury_steel?: number
          updated_at?: string
        }
        Update: {
          active_war_buffs?: Json | null
          active_war_participants_today?: number
          badge_icon?: string
          banner_color?: string | null
          clan_banner_cosmetic_id?: string | null
          created_at?: string
          current_war_tier?: number
          description?: string | null
          emblem_id?: string | null
          id?: string
          leader_id?: string
          members_count?: number
          name?: string
          required_trophies?: number
          tag?: string
          total_trophies?: number
          treasury_gems?: number | null
          treasury_gold?: number
          treasury_steel?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clans_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      command_pass_progress: {
        Row: {
          battle_badges_points: number
          claimed_free_tiers: number[]
          claimed_premium_tiers: number[]
          current_tier: number
          id: string
          is_premium_purchased: boolean
          premium_purchased_at: string | null
          season_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          battle_badges_points?: number
          claimed_free_tiers?: number[]
          claimed_premium_tiers?: number[]
          current_tier?: number
          id?: string
          is_premium_purchased?: boolean
          premium_purchased_at?: string | null
          season_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          battle_badges_points?: number
          claimed_free_tiers?: number[]
          claimed_premium_tiers?: number[]
          current_tier?: number
          id?: string
          is_premium_purchased?: boolean
          premium_purchased_at?: string | null
          season_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "command_pass_progress_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "command_pass_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      command_pass_tiers: {
        Row: {
          free_reward_json: Json
          premium_reward_json: Json
          required_badges: number
          season_id: string
          tier_number: number
        }
        Insert: {
          free_reward_json: Json
          premium_reward_json: Json
          required_badges: number
          season_id: string
          tier_number: number
        }
        Update: {
          free_reward_json?: Json
          premium_reward_json?: Json
          required_badges?: number
          season_id?: string
          tier_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "command_pass_tiers_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      commander_bonding_rewards_catalog: {
        Row: {
          bonding_level: number
          description: string
          required_total_xp: number
          reward_cosmetic_id: string | null
          reward_type: string
        }
        Insert: {
          bonding_level: number
          description: string
          required_total_xp: number
          reward_cosmetic_id?: string | null
          reward_type: string
        }
        Update: {
          bonding_level?: number
          description?: string
          required_total_xp?: number
          reward_cosmetic_id?: string | null
          reward_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "commander_bonding_rewards_catalog_reward_cosmetic_id_fkey"
            columns: ["reward_cosmetic_id"]
            isOneToOne: false
            referencedRelation: "cosmetics_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      commanders_catalog: {
        Row: {
          codename: string
          cop_name: string | null
          cop_stars: number | null
          cop_summary: string | null
          cost_modifier_percent: number
          created_at: string
          d2d_summary: string
          default_bubble_shape: string
          default_onomatopoeia: string | null
          faction: string
          id: string
          income_bonus_per_property: number
          is_revealed: boolean
          metadata: Json
          military_rank: string
          personality_archetype: string
          repair_bonus_hp: number
          scop_name: string
          scop_stars: number
          scop_summary: string
          unlock_method: string
          unlock_season: string | null
          vision_bonus: number
        }
        Insert: {
          codename: string
          cop_name?: string | null
          cop_stars?: number | null
          cop_summary?: string | null
          cost_modifier_percent?: number
          created_at?: string
          d2d_summary: string
          default_bubble_shape?: string
          default_onomatopoeia?: string | null
          faction: string
          id: string
          income_bonus_per_property?: number
          is_revealed?: boolean
          metadata?: Json
          military_rank: string
          personality_archetype?: string
          repair_bonus_hp?: number
          scop_name: string
          scop_stars: number
          scop_summary: string
          unlock_method?: string
          unlock_season?: string | null
          vision_bonus?: number
        }
        Update: {
          codename?: string
          cop_name?: string | null
          cop_stars?: number | null
          cop_summary?: string | null
          cost_modifier_percent?: number
          created_at?: string
          d2d_summary?: string
          default_bubble_shape?: string
          default_onomatopoeia?: string | null
          faction?: string
          id?: string
          income_bonus_per_property?: number
          is_revealed?: boolean
          metadata?: Json
          military_rank?: string
          personality_archetype?: string
          repair_bonus_hp?: number
          scop_name?: string
          scop_stars?: number
          scop_summary?: string
          unlock_method?: string
          unlock_season?: string | null
          vision_bonus?: number
        }
        Relationships: []
      }
      corporate_subsidiaries: {
        Row: {
          autonomous_market_allowed: boolean
          created_at: string
          grace_expires_at: string | null
          id: string
          parent_corp_id: string
          status: string
          subsidiary_clan_id: string
          tribute_rate_percent: number
        }
        Insert: {
          autonomous_market_allowed?: boolean
          created_at?: string
          grace_expires_at?: string | null
          id?: string
          parent_corp_id: string
          status?: string
          subsidiary_clan_id: string
          tribute_rate_percent?: number
        }
        Update: {
          autonomous_market_allowed?: boolean
          created_at?: string
          grace_expires_at?: string | null
          id?: string
          parent_corp_id?: string
          status?: string
          subsidiary_clan_id?: string
          tribute_rate_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "corporate_subsidiaries_parent_corp_id_fkey"
            columns: ["parent_corp_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_subsidiaries_subsidiary_clan_id_fkey"
            columns: ["subsidiary_clan_id"]
            isOneToOne: true
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
      cosmetics_catalog: {
        Row: {
          base_price_credits: number | null
          base_price_gems: number | null
          category: string | null
          cosmetic_type: string | null
          created_at: string
          description: string
          id: string
          is_base_default: boolean
          is_pass_exclusive: boolean | null
          is_premium_pass_exclusive: boolean
          name: string
          price_gems: number | null
          price_gold: number | null
          rarity: string
          target_entity_id: string | null
          visual_payload: Json | null
        }
        Insert: {
          base_price_credits?: number | null
          base_price_gems?: number | null
          category?: string | null
          cosmetic_type?: string | null
          created_at?: string
          description: string
          id: string
          is_base_default?: boolean
          is_pass_exclusive?: boolean | null
          is_premium_pass_exclusive?: boolean
          name: string
          price_gems?: number | null
          price_gold?: number | null
          rarity?: string
          target_entity_id?: string | null
          visual_payload?: Json | null
        }
        Update: {
          base_price_credits?: number | null
          base_price_gems?: number | null
          category?: string | null
          cosmetic_type?: string | null
          created_at?: string
          description?: string
          id?: string
          is_base_default?: boolean
          is_pass_exclusive?: boolean | null
          is_premium_pass_exclusive?: boolean
          name?: string
          price_gems?: number | null
          price_gold?: number | null
          rarity?: string
          target_entity_id?: string | null
          visual_payload?: Json | null
        }
        Relationships: []
      }
      currency_ledger: {
        Row: {
          balance_after: number
          created_at: string
          currency: string
          delta: number
          id: string
          metadata: Json | null
          reason: string
          reference_id: string | null
          user_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          currency: string
          delta: number
          id?: string
          metadata?: Json | null
          reason: string
          reference_id?: string | null
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          currency?: string
          delta?: number
          id?: string
          metadata?: Json | null
          reason?: string
          reference_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "currency_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      garrison_deployments: {
        Row: {
          ai_engine_tier: string
          commander_name: string
          created_at: string
          current_chassis_stock: Json
          expires_at: string | null
          garrison_level: number
          handshake_deadline: string | null
          hourly_upkeep_ec: number
          id: string
          is_legendary: boolean
          is_under_attack: boolean
          owning_clan_id: string
          province_id: string
          region_id: string | null
          retirement_due_at: string | null
          service_started_at: string
        }
        Insert: {
          ai_engine_tier?: string
          commander_name?: string
          created_at?: string
          current_chassis_stock?: Json
          expires_at?: string | null
          garrison_level?: number
          handshake_deadline?: string | null
          hourly_upkeep_ec?: number
          id?: string
          is_legendary?: boolean
          is_under_attack?: boolean
          owning_clan_id: string
          province_id: string
          region_id?: string | null
          retirement_due_at?: string | null
          service_started_at?: string
        }
        Update: {
          ai_engine_tier?: string
          commander_name?: string
          created_at?: string
          current_chassis_stock?: Json
          expires_at?: string | null
          garrison_level?: number
          handshake_deadline?: string | null
          hourly_upkeep_ec?: number
          id?: string
          is_legendary?: boolean
          is_under_attack?: boolean
          owning_clan_id?: string
          province_id?: string
          region_id?: string | null
          retirement_due_at?: string | null
          service_started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "garrison_deployments_owning_clan_id_fkey"
            columns: ["owning_clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garrison_deployments_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: true
            referencedRelation: "world_provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      industrial_refining_jobs: {
        Row: {
          building_type: string
          completes_at: string
          id: string
          input_amount: number
          input_resource: string
          is_boosted_with_fuel: boolean
          is_claimed: boolean
          output_amount: number
          output_resource: string
          started_at: string
          user_id: string
        }
        Insert: {
          building_type: string
          completes_at: string
          id?: string
          input_amount: number
          input_resource: string
          is_boosted_with_fuel?: boolean
          is_claimed?: boolean
          output_amount: number
          output_resource: string
          started_at?: string
          user_id: string
        }
        Update: {
          building_type?: string
          completes_at?: string
          id?: string
          input_amount?: number
          input_resource?: string
          is_boosted_with_fuel?: boolean
          is_claimed?: boolean
          output_amount?: number
          output_resource?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "industrial_refining_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maps: {
        Row: {
          author_id: string | null
          author_name: string
          awbw_map_id: number | null
          compiled_tiles: Json
          created_at: string
          default_alliances: Json
          default_rules: Json
          description: string
          height: number
          id: string
          is_official: boolean
          is_published: boolean
          likes_count: number
          max_players: number
          name: string
          play_count: number
          property_stats: Json
          raw_tile_csv: string
          recommended_mode: string
          starting_units: Json
          supported_modes: string[]
          tags: string[]
          updated_at: string
          version: number
          width: number
        }
        Insert: {
          author_id?: string | null
          author_name?: string
          awbw_map_id?: number | null
          compiled_tiles?: Json
          created_at?: string
          default_alliances?: Json
          default_rules?: Json
          description?: string
          height: number
          id: string
          is_official?: boolean
          is_published?: boolean
          likes_count?: number
          max_players?: number
          name: string
          play_count?: number
          property_stats?: Json
          raw_tile_csv?: string
          recommended_mode?: string
          starting_units?: Json
          supported_modes?: string[]
          tags?: string[]
          updated_at?: string
          version?: number
          width: number
        }
        Update: {
          author_id?: string | null
          author_name?: string
          awbw_map_id?: number | null
          compiled_tiles?: Json
          created_at?: string
          default_alliances?: Json
          default_rules?: Json
          description?: string
          height?: number
          id?: string
          is_official?: boolean
          is_published?: boolean
          likes_count?: number
          max_players?: number
          name?: string
          play_count?: number
          property_stats?: Json
          raw_tile_csv?: string
          recommended_mode?: string
          starting_units?: Json
          supported_modes?: string[]
          tags?: string[]
          updated_at?: string
          version?: number
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "maps_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_action_deltas: {
        Row: {
          action_index: number
          action_payload: Json
          created_at: string | null
          id: number
          match_id: string
          turn_number: number
        }
        Insert: {
          action_index: number
          action_payload: Json
          created_at?: string | null
          id?: number
          match_id: string
          turn_number: number
        }
        Update: {
          action_index?: number
          action_payload?: Json
          created_at?: string | null
          id?: number
          match_id?: string
          turn_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_action_deltas_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "active_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_actions: {
        Row: {
          action_payload: Json
          action_type: string
          actor_slot: number
          actor_user_id: string | null
          combat_result: Json | null
          created_at: string
          dest_x: number | null
          dest_y: number | null
          id: string
          is_bot_action: boolean
          match_id: string
          movement_path: Json | null
          origin_x: number | null
          origin_y: number | null
          rng_roll_used: number | null
          sequence_id: number
          state_delta: Json
          target_unit_id: string | null
          target_x: number | null
          target_y: number | null
          thinking_time_ms: number
          turn_number: number
          unit_id: string | null
          was_fow_trap: boolean
        }
        Insert: {
          action_payload?: Json
          action_type: string
          actor_slot: number
          actor_user_id?: string | null
          combat_result?: Json | null
          created_at?: string
          dest_x?: number | null
          dest_y?: number | null
          id?: string
          is_bot_action?: boolean
          match_id: string
          movement_path?: Json | null
          origin_x?: number | null
          origin_y?: number | null
          rng_roll_used?: number | null
          sequence_id: number
          state_delta?: Json
          target_unit_id?: string | null
          target_x?: number | null
          target_y?: number | null
          thinking_time_ms?: number
          turn_number: number
          unit_id?: string | null
          was_fow_trap?: boolean
        }
        Update: {
          action_payload?: Json
          action_type?: string
          actor_slot?: number
          actor_user_id?: string | null
          combat_result?: Json | null
          created_at?: string
          dest_x?: number | null
          dest_y?: number | null
          id?: string
          is_bot_action?: boolean
          match_id?: string
          movement_path?: Json | null
          origin_x?: number | null
          origin_y?: number | null
          rng_roll_used?: number | null
          sequence_id?: number
          state_delta?: Json
          target_unit_id?: string | null
          target_x?: number | null
          target_y?: number | null
          thinking_time_ms?: number
          turn_number?: number
          unit_id?: string | null
          was_fow_trap?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "match_actions_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_actions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "active_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_airdrop_events: {
        Row: {
          created_at: string
          id: string
          match_id: string
          player_id: string | null
          reward_payload: Json
          reward_type: string
          tile_x: number
          tile_y: number
          turn_number: number
          unit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          player_id?: string | null
          reward_payload: Json
          reward_type: string
          tile_x: number
          tile_y: number
          turn_number: number
          unit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          player_id?: string | null
          reward_payload?: Json
          reward_type?: string
          tile_x?: number
          tile_y?: number
          turn_number?: number
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_airdrop_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "active_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_airdrop_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_detailed_telemetry: {
        Row: {
          avg_turn_duration_sec: number
          cop_activations_count: number
          created_at: string
          damage_dealt_total: number
          damage_received_total: number
          fow_traps_triggered: number
          funds_spent_total: number
          funds_wasted_idle: number
          game_mode: string
          hq_lowest_hp_reached: number
          id: string
          match_id: string
          opponent_commander_id: string | null
          scop_activations_count: number
          selected_commander_id: string
          surrendered_early: boolean
          total_turns_played: number
          turns_over_45s_count: number
          turns_under_10s_count: number
          units_killed_count: number
          units_lost_count: number
          units_produced_count: number
          user_id: string
          won_match: boolean
        }
        Insert: {
          avg_turn_duration_sec?: number
          cop_activations_count?: number
          created_at?: string
          damage_dealt_total?: number
          damage_received_total?: number
          fow_traps_triggered?: number
          funds_spent_total?: number
          funds_wasted_idle?: number
          game_mode: string
          hq_lowest_hp_reached?: number
          id?: string
          match_id: string
          opponent_commander_id?: string | null
          scop_activations_count?: number
          selected_commander_id: string
          surrendered_early?: boolean
          total_turns_played?: number
          turns_over_45s_count?: number
          turns_under_10s_count?: number
          units_killed_count?: number
          units_lost_count?: number
          units_produced_count?: number
          user_id: string
          won_match?: boolean
        }
        Update: {
          avg_turn_duration_sec?: number
          cop_activations_count?: number
          created_at?: string
          damage_dealt_total?: number
          damage_received_total?: number
          fow_traps_triggered?: number
          funds_spent_total?: number
          funds_wasted_idle?: number
          game_mode?: string
          hq_lowest_hp_reached?: number
          id?: string
          match_id?: string
          opponent_commander_id?: string | null
          scop_activations_count?: number
          selected_commander_id?: string
          surrendered_early?: boolean
          total_turns_played?: number
          turns_over_45s_count?: number
          turns_under_10s_count?: number
          units_killed_count?: number
          units_lost_count?: number
          units_produced_count?: number
          user_id?: string
          won_match?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "match_detailed_telemetry_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "active_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_detailed_telemetry_opponent_commander_id_fkey"
            columns: ["opponent_commander_id"]
            isOneToOne: false
            referencedRelation: "commanders_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_detailed_telemetry_selected_commander_id_fkey"
            columns: ["selected_commander_id"]
            isOneToOne: false
            referencedRelation: "commanders_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_detailed_telemetry_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_history: {
        Row: {
          created_at: string
          duration_seconds: number
          end_reason: string
          final_stats: Json
          game_mode: string
          id: string
          is_tournament_cap_applied: boolean
          match_id: string
          near_miss_data: Json | null
          p1_average_deck_level: number | null
          p1_credits_awarded: number
          p1_xp_awarded: number
          p2_average_deck_level: number | null
          p2_credits_awarded: number
          p2_xp_awarded: number
          player1_id: string
          player2_id: string | null
          total_turns: number
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds: number
          end_reason: string
          final_stats?: Json
          game_mode: string
          id?: string
          is_tournament_cap_applied?: boolean
          match_id: string
          near_miss_data?: Json | null
          p1_average_deck_level?: number | null
          p1_credits_awarded?: number
          p1_xp_awarded?: number
          p2_average_deck_level?: number | null
          p2_credits_awarded?: number
          p2_xp_awarded?: number
          player1_id: string
          player2_id?: string | null
          total_turns: number
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          end_reason?: string
          final_stats?: Json
          game_mode?: string
          id?: string
          is_tournament_cap_applied?: boolean
          match_id?: string
          near_miss_data?: Json | null
          p1_average_deck_level?: number | null
          p1_credits_awarded?: number
          p1_xp_awarded?: number
          p2_average_deck_level?: number | null
          p2_credits_awarded?: number
          p2_xp_awarded?: number
          player1_id?: string
          player2_id?: string | null
          total_turns?: number
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_history_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_history_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_history_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_participants: {
        Row: {
          active_co_power: string | null
          bot_difficulty: string | null
          co_power_activations_count: number
          co_power_meter: number
          commander_id: string
          commander_level: number
          consecutive_inactive_turns: number
          created_at: string
          deck_state: Json
          disconnect_grace_bank_sec: number
          disconnected_at: string | null
          eliminated_at_turn: number | null
          funds: number
          id: string
          is_bot: boolean
          is_connected: boolean
          is_eliminated: boolean
          last_heartbeat_at: string | null
          match_id: string
          player_slot: number
          slot_key: string
          team_id: string
          total_thinking_time_sec: number
          turns_played_count: number
          user_id: string | null
        }
        Insert: {
          active_co_power?: string | null
          bot_difficulty?: string | null
          co_power_activations_count?: number
          co_power_meter?: number
          commander_id?: string
          commander_level?: number
          consecutive_inactive_turns?: number
          created_at?: string
          deck_state?: Json
          disconnect_grace_bank_sec?: number
          disconnected_at?: string | null
          eliminated_at_turn?: number | null
          funds?: number
          id?: string
          is_bot?: boolean
          is_connected?: boolean
          is_eliminated?: boolean
          last_heartbeat_at?: string | null
          match_id: string
          player_slot: number
          slot_key: string
          team_id?: string
          total_thinking_time_sec?: number
          turns_played_count?: number
          user_id?: string | null
        }
        Update: {
          active_co_power?: string | null
          bot_difficulty?: string | null
          co_power_activations_count?: number
          co_power_meter?: number
          commander_id?: string
          commander_level?: number
          consecutive_inactive_turns?: number
          created_at?: string
          deck_state?: Json
          disconnect_grace_bank_sec?: number
          disconnected_at?: string | null
          eliminated_at_turn?: number | null
          funds?: number
          id?: string
          is_bot?: boolean
          is_connected?: boolean
          is_eliminated?: boolean
          last_heartbeat_at?: string | null
          match_id?: string
          player_slot?: number
          slot_key?: string
          team_id?: string
          total_thinking_time_sec?: number
          turns_played_count?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_participants_commander_id_fkey"
            columns: ["commander_id"]
            isOneToOne: false
            referencedRelation: "commanders_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_participants_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "active_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_player_views: {
        Row: {
          last_action_seq: number
          match_id: string
          own_card_cooldowns: Json
          own_co_power: number
          own_funds: number
          player_id: string
          public_event_feed: Json
          state_version: number
          updated_at: string
          visible_properties: Json
          visible_units: Json
        }
        Insert: {
          last_action_seq?: number
          match_id: string
          own_card_cooldowns?: Json
          own_co_power?: number
          own_funds?: number
          player_id: string
          public_event_feed?: Json
          state_version?: number
          updated_at?: string
          visible_properties?: Json
          visible_units?: Json
        }
        Update: {
          last_action_seq?: number
          match_id?: string
          own_card_cooldowns?: Json
          own_co_power?: number
          own_funds?: number
          player_id?: string
          public_event_feed?: Json
          state_version?: number
          updated_at?: string
          visible_properties?: Json
          visible_units?: Json
        }
        Relationships: [
          {
            foreignKeyName: "match_player_views_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "active_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_player_views_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_replays: {
        Row: {
          actions_digest_jsonb: Json | null
          compressed_actions: string | null
          created_at: string
          initial_seed: Json
          map_id: string
          match_id: string
          total_actions: number
        }
        Insert: {
          actions_digest_jsonb?: Json | null
          compressed_actions?: string | null
          created_at?: string
          initial_seed: Json
          map_id: string
          match_id: string
          total_actions?: number
        }
        Update: {
          actions_digest_jsonb?: Json | null
          compressed_actions?: string | null
          created_at?: string
          initial_seed?: Json
          map_id?: string
          match_id?: string
          total_actions?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_replays_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "match_history"
            referencedColumns: ["id"]
          },
        ]
      }
      match_state: {
        Row: {
          action_log: Json
          airdrops: Json
          co_power_gauge: Json
          current_weather: string
          fog_of_war_enabled: boolean
          grid_height: number
          grid_width: number
          last_action_seq: number
          match_id: string
          player_funds: Json
          properties: Json
          submerged_unit_ids: string[]
          tiles: Json
          transport_manifests: Json
          units: Json
          updated_at: string
          weather_forecast: Json
          weather_turns_remaining: number
        }
        Insert: {
          action_log?: Json
          airdrops?: Json
          co_power_gauge?: Json
          current_weather?: string
          fog_of_war_enabled?: boolean
          grid_height?: number
          grid_width?: number
          last_action_seq?: number
          match_id: string
          player_funds?: Json
          properties: Json
          submerged_unit_ids?: string[]
          tiles: Json
          transport_manifests?: Json
          units: Json
          updated_at?: string
          weather_forecast?: Json
          weather_turns_remaining?: number
        }
        Update: {
          action_log?: Json
          airdrops?: Json
          co_power_gauge?: Json
          current_weather?: string
          fog_of_war_enabled?: boolean
          grid_height?: number
          grid_width?: number
          last_action_seq?: number
          match_id?: string
          player_funds?: Json
          properties?: Json
          submerged_unit_ids?: string[]
          tiles?: Json
          transport_manifests?: Json
          units?: Json
          updated_at?: string
          weather_forecast?: Json
          weather_turns_remaining?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_state_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "active_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_turn_snapshots: {
        Row: {
          created_at: string | null
          match_id: string
          snapshot_data: Json
          turn_number: number
        }
        Insert: {
          created_at?: string | null
          match_id: string
          snapshot_data: Json
          turn_number: number
        }
        Update: {
          created_at?: string | null
          match_id?: string
          snapshot_data?: Json
          turn_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_turn_snapshots_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "active_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matchmaking_queue: {
        Row: {
          commander_id: string | null
          deck_snapshot: Json
          elo_rating: number
          enqueued_at: string
          expires_at: string
          game_mode: string
          matched_match_id: string | null
          preferred_theater: string
          pte_profile: string
          queued_at: string
          status: string
          trophies: number
          trophies_count: number
          updated_at: string
          user_id: string
          weighted_power: number
        }
        Insert: {
          commander_id?: string | null
          deck_snapshot?: Json
          elo_rating: number
          enqueued_at?: string
          expires_at?: string
          game_mode: string
          matched_match_id?: string | null
          preferred_theater?: string
          pte_profile?: string
          queued_at?: string
          status?: string
          trophies?: number
          trophies_count?: number
          updated_at?: string
          user_id: string
          weighted_power?: number
        }
        Update: {
          commander_id?: string | null
          deck_snapshot?: Json
          elo_rating?: number
          enqueued_at?: string
          expires_at?: string
          game_mode?: string
          matched_match_id?: string | null
          preferred_theater?: string
          pte_profile?: string
          queued_at?: string
          status?: string
          trophies?: number
          trophies_count?: number
          updated_at?: string
          user_id?: string
          weighted_power?: number
        }
        Relationships: [
          {
            foreignKeyName: "matchmaking_queue_matched_match_id_fkey"
            columns: ["matched_match_id"]
            isOneToOne: false
            referencedRelation: "active_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matchmaking_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mirror_duel_queue: {
        Row: {
          co_commander_id: string
          matched_match_id: string | null
          queued_at: string
          trophies: number
          user_id: string
        }
        Insert: {
          co_commander_id: string
          matched_match_id?: string | null
          queued_at?: string
          trophies?: number
          user_id: string
        }
        Update: {
          co_commander_id?: string
          matched_match_id?: string | null
          queued_at?: string
          trophies?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mirror_duel_queue_co_commander_id_fkey"
            columns: ["co_commander_id"]
            isOneToOne: false
            referencedRelation: "commanders_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mirror_duel_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      p2p_market_listings: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          price_per_unit: number
          quantity: number
          resource_type: string
          seller_id: string
          status: string
          total_price: number
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          price_per_unit: number
          quantity: number
          resource_type: string
          seller_id: string
          status?: string
          total_price: number
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          price_per_unit?: number
          quantity?: number
          resource_type?: string
          seller_id?: string
          status?: string
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "p2p_market_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      p2p_market_orders: {
        Row: {
          buyer_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          item_category: string
          item_code: string
          net_seller_revenue_ec: number
          origin_province_id: string | null
          platform_burn_ec: number
          province_royalty_ec: number
          province_terminal_id: string | null
          quantity: number
          seller_id: string
          status: string
          tier: number
          total_price_ec: number
          unit_price_ec: number
        }
        Insert: {
          buyer_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          item_category: string
          item_code: string
          net_seller_revenue_ec?: number
          origin_province_id?: string | null
          platform_burn_ec?: number
          province_royalty_ec?: number
          province_terminal_id?: string | null
          quantity: number
          seller_id: string
          status?: string
          tier?: number
          total_price_ec: number
          unit_price_ec: number
        }
        Update: {
          buyer_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          item_category?: string
          item_code?: string
          net_seller_revenue_ec?: number
          origin_province_id?: string | null
          platform_burn_ec?: number
          province_royalty_ec?: number
          province_terminal_id?: string | null
          quantity?: number
          seller_id?: string
          status?: string
          tier?: number
          total_price_ec?: number
          unit_price_ec?: number
        }
        Relationships: [
          {
            foreignKeyName: "p2p_market_orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2p_market_orders_origin_province_id_fkey"
            columns: ["origin_province_id"]
            isOneToOne: false
            referencedRelation: "world_provinces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2p_market_orders_province_terminal_id_fkey"
            columns: ["province_terminal_id"]
            isOneToOne: false
            referencedRelation: "world_provinces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2p_market_orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      p2p_price_reference: {
        Row: {
          last_recalculated_at: string
          max_price_collar: number
          min_price_collar: number
          pmm_24h: number
          resource_type: string
        }
        Insert: {
          last_recalculated_at?: string
          max_price_collar: number
          min_price_collar: number
          pmm_24h: number
          resource_type: string
        }
        Update: {
          last_recalculated_at?: string
          max_price_collar?: number
          min_price_collar?: number
          pmm_24h?: number
          resource_type?: string
        }
        Relationships: []
      }
      payments_audit: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          items_delivered: Json
          product_sku: string
          product_type: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          items_delivered: Json
          product_sku: string
          product_type: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          items_delivered?: Json
          product_sku?: string
          product_type?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_tactical_behavior_profile: {
        Row: {
          aggression_index: number
          air_bias_percentage: number
          ambushes_inflicted_count: number
          ambushes_suffered_count: number
          avg_pte_seconds: number
          avg_unspent_funds_per_turn: number
          clutch_wins_count: number
          consecutive_loss_streak_peak: number
          consecutive_win_streak_peak: number
          counter_offensive_expires_at: string | null
          counter_offensive_offer: Json | null
          current_streak: number
          early_surrenders_count: number
          factory_idle_turns_total: number
          fastest_turn_seconds: number
          favorite_branch: string
          favorite_unit_code: string
          patience_score: number
          prefers_high_cost_units: boolean
          siege_bias_percentage: number
          slowest_turn_seconds: number
          tilt_index: number
          updated_at: string
          user_id: string
        }
        Insert: {
          aggression_index?: number
          air_bias_percentage?: number
          ambushes_inflicted_count?: number
          ambushes_suffered_count?: number
          avg_pte_seconds?: number
          avg_unspent_funds_per_turn?: number
          clutch_wins_count?: number
          consecutive_loss_streak_peak?: number
          consecutive_win_streak_peak?: number
          counter_offensive_expires_at?: string | null
          counter_offensive_offer?: Json | null
          current_streak?: number
          early_surrenders_count?: number
          factory_idle_turns_total?: number
          fastest_turn_seconds?: number
          favorite_branch?: string
          favorite_unit_code?: string
          patience_score?: number
          prefers_high_cost_units?: boolean
          siege_bias_percentage?: number
          slowest_turn_seconds?: number
          tilt_index?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          aggression_index?: number
          air_bias_percentage?: number
          ambushes_inflicted_count?: number
          ambushes_suffered_count?: number
          avg_pte_seconds?: number
          avg_unspent_funds_per_turn?: number
          clutch_wins_count?: number
          consecutive_loss_streak_peak?: number
          consecutive_win_streak_peak?: number
          counter_offensive_expires_at?: string | null
          counter_offensive_offer?: Json | null
          current_streak?: number
          early_surrenders_count?: number
          factory_idle_turns_total?: number
          fastest_turn_seconds?: number
          favorite_branch?: string
          favorite_unit_code?: string
          patience_score?: number
          prefers_high_cost_units?: boolean
          siege_bias_percentage?: number
          slowest_turn_seconds?: number
          tilt_index?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_tactical_behavior_profile_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_level: number
          active_avatar_frame_id: string | null
          active_banner_id: string | null
          active_lobby_vfx_id: string | null
          avatar_url: string | null
          average_turn_seconds: number
          battle_credits: number
          clan_id: string | null
          command_gems: number
          country_code: string | null
          created_at: string
          current_win_streak: number
          current_xp: number
          custom_bio: string | null
          daily_offline_matches_count: number
          decay_bank_days: number
          elo_rating: number
          elo_rating_esports: number
          equipped_cosmetics: Json
          equipped_deck: Json
          equipped_loadout: Json
          highest_trophies: number
          highest_win_streak: number
          id: string
          is_chat_banned: boolean
          is_safeguard_equipped: boolean
          last_competitive_match_at: string | null
          last_daily_safeguard_claim: string | null
          last_decay_processed_at: string | null
          last_embargo_rescue_at: string | null
          last_furlough_reset_at: string | null
          last_nickname_change_at: string | null
          last_offline_match_date: string | null
          military_furloughs_left: number | null
          military_title: string | null
          muted_until: string | null
          pinned_medals: Json | null
          pte_profile: string
          safeguard_items_count: number
          selected_commander_id: string
          tag_id: string | null
          total_matches_played: number
          total_victories: number
          trophies_count: number
          ui_palette_id: string | null
          updated_at: string
          username: string
          wallet_balance: number | null
        }
        Insert: {
          account_level?: number
          active_avatar_frame_id?: string | null
          active_banner_id?: string | null
          active_lobby_vfx_id?: string | null
          avatar_url?: string | null
          average_turn_seconds?: number
          battle_credits?: number
          clan_id?: string | null
          command_gems?: number
          country_code?: string | null
          created_at?: string
          current_win_streak?: number
          current_xp?: number
          custom_bio?: string | null
          daily_offline_matches_count?: number
          decay_bank_days?: number
          elo_rating?: number
          elo_rating_esports?: number
          equipped_cosmetics?: Json
          equipped_deck?: Json
          equipped_loadout?: Json
          highest_trophies?: number
          highest_win_streak?: number
          id: string
          is_chat_banned?: boolean
          is_safeguard_equipped?: boolean
          last_competitive_match_at?: string | null
          last_daily_safeguard_claim?: string | null
          last_decay_processed_at?: string | null
          last_embargo_rescue_at?: string | null
          last_furlough_reset_at?: string | null
          last_nickname_change_at?: string | null
          last_offline_match_date?: string | null
          military_furloughs_left?: number | null
          military_title?: string | null
          muted_until?: string | null
          pinned_medals?: Json | null
          pte_profile?: string
          safeguard_items_count?: number
          selected_commander_id?: string
          tag_id?: string | null
          total_matches_played?: number
          total_victories?: number
          trophies_count?: number
          ui_palette_id?: string | null
          updated_at?: string
          username: string
          wallet_balance?: number | null
        }
        Update: {
          account_level?: number
          active_avatar_frame_id?: string | null
          active_banner_id?: string | null
          active_lobby_vfx_id?: string | null
          avatar_url?: string | null
          average_turn_seconds?: number
          battle_credits?: number
          clan_id?: string | null
          command_gems?: number
          country_code?: string | null
          created_at?: string
          current_win_streak?: number
          current_xp?: number
          custom_bio?: string | null
          daily_offline_matches_count?: number
          decay_bank_days?: number
          elo_rating?: number
          elo_rating_esports?: number
          equipped_cosmetics?: Json
          equipped_deck?: Json
          equipped_loadout?: Json
          highest_trophies?: number
          highest_win_streak?: number
          id?: string
          is_chat_banned?: boolean
          is_safeguard_equipped?: boolean
          last_competitive_match_at?: string | null
          last_daily_safeguard_claim?: string | null
          last_decay_processed_at?: string | null
          last_embargo_rescue_at?: string | null
          last_furlough_reset_at?: string | null
          last_nickname_change_at?: string | null
          last_offline_match_date?: string | null
          military_furloughs_left?: number | null
          military_title?: string | null
          muted_until?: string | null
          pinned_medals?: Json | null
          pte_profile?: string
          safeguard_items_count?: number
          selected_commander_id?: string
          tag_id?: string | null
          total_matches_played?: number
          total_victories?: number
          trophies_count?: number
          ui_palette_id?: string | null
          updated_at?: string
          username?: string
          wallet_balance?: number | null
        }
        Relationships: []
      }
      quests_catalog: {
        Row: {
          description: string
          id: string
          objective_type: string
          quest_scope: string
          reward_badges: number
          reward_credits: number
          reward_gems: number
          target_value: number
          title: string
        }
        Insert: {
          description: string
          id: string
          objective_type: string
          quest_scope: string
          reward_badges?: number
          reward_credits?: number
          reward_gems?: number
          target_value: number
          title: string
        }
        Update: {
          description?: string
          id?: string
          objective_type?: string
          quest_scope?: string
          reward_badges?: number
          reward_credits?: number
          reward_gems?: number
          target_value?: number
          title?: string
        }
        Relationships: []
      }
      safeguard_crafting_jobs: {
        Row: {
          completes_at: string
          id: string
          is_claimed: boolean
          started_at: string
          user_id: string
        }
        Insert: {
          completes_at: string
          id?: string
          is_claimed?: boolean
          started_at?: string
          user_id: string
        }
        Update: {
          completes_at?: string
          id?: string
          is_claimed?: boolean
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safeguard_crafting_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons_catalog: {
        Row: {
          ends_at: string
          id: string
          is_active: boolean
          name: string
          starts_at: string
          theme_commander_id: string | null
        }
        Insert: {
          ends_at: string
          id: string
          is_active?: boolean
          name: string
          starts_at: string
          theme_commander_id?: string | null
        }
        Update: {
          ends_at?: string
          id?: string
          is_active?: boolean
          name?: string
          starts_at?: string
          theme_commander_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasons_catalog_theme_commander_id_fkey"
            columns: ["theme_commander_id"]
            isOneToOne: false
            referencedRelation: "commanders_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_offers: {
        Row: {
          available_from: string
          available_until: string | null
          created_at: string
          currency: string
          id: string
          is_active: boolean
          max_purchases_per_user: number | null
          offer_type: string
          original_price: number | null
          price: number
          rewards_payload: Json
          title: string
        }
        Insert: {
          available_from?: string
          available_until?: string | null
          created_at?: string
          currency: string
          id: string
          is_active?: boolean
          max_purchases_per_user?: number | null
          offer_type: string
          original_price?: number | null
          price: number
          rewards_payload: Json
          title: string
        }
        Update: {
          available_from?: string
          available_until?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          max_purchases_per_user?: number | null
          offer_type?: string
          original_price?: number | null
          price?: number
          rewards_payload?: Json
          title?: string
        }
        Relationships: []
      }
      social_config_params: {
        Row: {
          config: Json
          id: string
          updated_at: string | null
        }
        Insert: {
          config: Json
          id: string
          updated_at?: string | null
        }
        Update: {
          config?: Json
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      store_products_catalog: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          metadata: Json
          name: string
          price_usd: number
          reward_blueprints: number
          reward_concrete: number
          reward_credits: number
          reward_gems: number
          reward_microchips: number
          reward_steel: number
          safeguards_included: number
        }
        Insert: {
          category: string
          created_at?: string
          id: string
          is_active?: boolean
          metadata?: Json
          name: string
          price_usd: number
          reward_blueprints?: number
          reward_concrete?: number
          reward_credits?: number
          reward_gems?: number
          reward_microchips?: number
          reward_steel?: number
          safeguards_included?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          price_usd?: number
          reward_blueprints?: number
          reward_concrete?: number
          reward_credits?: number
          reward_gems?: number
          reward_microchips?: number
          reward_steel?: number
          safeguards_included?: number
        }
        Relationships: []
      }
      system_economy_config: {
        Row: {
          config_key: string
          config_value: Json
          description: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value: Json
          description: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          description?: string
          updated_at?: string
        }
        Relationships: []
      }
      terrain_catalog: {
        Row: {
          default_hp: number | null
          defense_stars: number
          display_name: string
          generates_funds: number
          heals_air: boolean
          heals_land: boolean
          heals_sea: boolean
          id: string
          infantry_vision_bonus: number
          is_capturable: boolean
          is_destructible: boolean
          move_cost_air: number | null
          move_cost_foot: number | null
          move_cost_mech: number | null
          move_cost_pipe: number | null
          move_cost_sea: number | null
          move_cost_treads: number | null
          move_cost_wheels: number | null
          provides_fow_cover: boolean
        }
        Insert: {
          default_hp?: number | null
          defense_stars?: number
          display_name: string
          generates_funds?: number
          heals_air?: boolean
          heals_land?: boolean
          heals_sea?: boolean
          id: string
          infantry_vision_bonus?: number
          is_capturable?: boolean
          is_destructible?: boolean
          move_cost_air?: number | null
          move_cost_foot?: number | null
          move_cost_mech?: number | null
          move_cost_pipe?: number | null
          move_cost_sea?: number | null
          move_cost_treads?: number | null
          move_cost_wheels?: number | null
          provides_fow_cover?: boolean
        }
        Update: {
          default_hp?: number | null
          defense_stars?: number
          display_name?: string
          generates_funds?: number
          heals_air?: boolean
          heals_land?: boolean
          heals_sea?: boolean
          id?: string
          infantry_vision_bonus?: number
          is_capturable?: boolean
          is_destructible?: boolean
          move_cost_air?: number | null
          move_cost_foot?: number | null
          move_cost_mech?: number | null
          move_cost_pipe?: number | null
          move_cost_sea?: number | null
          move_cost_treads?: number | null
          move_cost_wheels?: number | null
          provides_fow_cover?: boolean
        }
        Relationships: []
      }
      territory_adjacencies: {
        Row: {
          connection_type: string
          created_at: string
          from_province_id: string
          id: string
          is_blocked: boolean
          max_bandwidth_tons: number
          to_province_id: string
          toll_rate_percent: number
        }
        Insert: {
          connection_type: string
          created_at?: string
          from_province_id: string
          id?: string
          is_blocked?: boolean
          max_bandwidth_tons?: number
          to_province_id: string
          toll_rate_percent?: number
        }
        Update: {
          connection_type?: string
          created_at?: string
          from_province_id?: string
          id?: string
          is_blocked?: boolean
          max_bandwidth_tons?: number
          to_province_id?: string
          toll_rate_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "territory_adjacencies_from_province_id_fkey"
            columns: ["from_province_id"]
            isOneToOne: false
            referencedRelation: "world_provinces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_adjacencies_to_province_id_fkey"
            columns: ["to_province_id"]
            isOneToOne: false
            referencedRelation: "world_provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_control: {
        Row: {
          controlling_alliance_id: string | null
          controlling_clan_id: string | null
          cooldown_expires_at: string | null
          current_tcp: number
          fortress_level: number
          last_battle_at: string | null
          province_id: string
          status: string
          tcp_threshold: number
          updated_at: string
        }
        Insert: {
          controlling_alliance_id?: string | null
          controlling_clan_id?: string | null
          cooldown_expires_at?: string | null
          current_tcp?: number
          fortress_level?: number
          last_battle_at?: string | null
          province_id: string
          status?: string
          tcp_threshold?: number
          updated_at?: string
        }
        Update: {
          controlling_alliance_id?: string | null
          controlling_clan_id?: string | null
          cooldown_expires_at?: string | null
          current_tcp?: number
          fortress_level?: number
          last_battle_at?: string | null
          province_id?: string
          status?: string
          tcp_threshold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "territory_control_controlling_clan_id_fkey"
            columns: ["controlling_clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_control_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: true
            referencedRelation: "world_provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_nodes: {
        Row: {
          controller_clan_id: string | null
          defense_level: number
          energy_upkeep: number
          id: string
          is_under_attack: boolean
          max_hp: number
          name: string
          node_type: string
          output_per_min: number
          province_id: string
          structural_hp: number
          updated_at: string
        }
        Insert: {
          controller_clan_id?: string | null
          defense_level?: number
          energy_upkeep?: number
          id: string
          is_under_attack?: boolean
          max_hp?: number
          name: string
          node_type: string
          output_per_min?: number
          province_id: string
          structural_hp?: number
          updated_at?: string
        }
        Update: {
          controller_clan_id?: string | null
          defense_level?: number
          energy_upkeep?: number
          id?: string
          is_under_attack?: boolean
          max_hp?: number
          name?: string
          node_type?: string
          output_per_min?: number
          province_id?: string
          structural_hp?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "territory_nodes_controller_clan_id_fkey"
            columns: ["controller_clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_nodes_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "world_provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      tilt_emergency_offers: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          offer_price_usd: number
          reward_cards_amount: number
          reward_steel_amount: number
          status: string
          stripe_session_id: string | null
          target_unit_id: string
          triggered_by_match_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          offer_price_usd?: number
          reward_cards_amount?: number
          reward_steel_amount?: number
          status?: string
          stripe_session_id?: string | null
          target_unit_id: string
          triggered_by_match_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          offer_price_usd?: number
          reward_cards_amount?: number
          reward_steel_amount?: number
          status?: string
          stripe_session_id?: string | null
          target_unit_id?: string
          triggered_by_match_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tilt_emergency_offers_triggered_by_match_id_fkey"
            columns: ["triggered_by_match_id"]
            isOneToOne: false
            referencedRelation: "active_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tilt_emergency_offers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_weapon_damage_matrix: {
        Row: {
          attacker_unit_id: string
          defender_unit_id: string
          primary_damage: number | null
          secondary_damage: number | null
        }
        Insert: {
          attacker_unit_id: string
          defender_unit_id: string
          primary_damage?: number | null
          secondary_damage?: number | null
        }
        Update: {
          attacker_unit_id?: string
          defender_unit_id?: string
          primary_damage?: number | null
          secondary_damage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "unit_weapon_damage_matrix_attacker_unit_id_fkey"
            columns: ["attacker_unit_id"]
            isOneToOne: false
            referencedRelation: "units_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_weapon_damage_matrix_defender_unit_id_fkey"
            columns: ["defender_unit_id"]
            isOneToOne: false
            referencedRelation: "units_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      units_catalog: {
        Row: {
          ammo_max: number
          base_attack: number
          base_cooldown_turns: number
          can_move_and_fire: boolean
          category: string
          created_at: string
          display_name: string
          fuel_burn_hidden: number
          fuel_burn_per_turn: number
          fuel_max: number
          hp_max: number
          id: string
          is_awbw_extended: boolean
          is_base_unlocked: boolean
          max_range: number
          metadata: Json | null
          min_range: number
          movement_points: number
          movement_type: string
          primary_weapon_name: string | null
          production_cost_g: number
          production_facility: string
          required_account_level: number
          secondary_weapon_name: string | null
          special_actions: string[]
          transport_allowed_codes: string[]
          transport_capacity: number
          unlock_cost_credits: number
          vision_range: number
          weight_class: string
        }
        Insert: {
          ammo_max?: number
          base_attack?: number
          base_cooldown_turns?: number
          can_move_and_fire?: boolean
          category: string
          created_at?: string
          display_name: string
          fuel_burn_hidden?: number
          fuel_burn_per_turn?: number
          fuel_max?: number
          hp_max?: number
          id: string
          is_awbw_extended?: boolean
          is_base_unlocked?: boolean
          max_range?: number
          metadata?: Json | null
          min_range?: number
          movement_points?: number
          movement_type: string
          primary_weapon_name?: string | null
          production_cost_g?: number
          production_facility?: string
          required_account_level?: number
          secondary_weapon_name?: string | null
          special_actions?: string[]
          transport_allowed_codes?: string[]
          transport_capacity?: number
          unlock_cost_credits?: number
          vision_range?: number
          weight_class?: string
        }
        Update: {
          ammo_max?: number
          base_attack?: number
          base_cooldown_turns?: number
          can_move_and_fire?: boolean
          category?: string
          created_at?: string
          display_name?: string
          fuel_burn_hidden?: number
          fuel_burn_per_turn?: number
          fuel_max?: number
          hp_max?: number
          id?: string
          is_awbw_extended?: boolean
          is_base_unlocked?: boolean
          max_range?: number
          metadata?: Json | null
          min_range?: number
          movement_points?: number
          movement_type?: string
          primary_weapon_name?: string | null
          production_cost_g?: number
          production_facility?: string
          required_account_level?: number
          secondary_weapon_name?: string | null
          special_actions?: string[]
          transport_allowed_codes?: string[]
          transport_capacity?: number
          unlock_cost_credits?: number
          vision_range?: number
          weight_class?: string
        }
        Relationships: []
      }
      user_cards: {
        Row: {
          card_level: number
          cards_count: number
          created_at: string
          equipped_skin_id: string
          favorite: boolean
          id: string
          unit_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_level?: number
          cards_count?: number
          created_at?: string
          equipped_skin_id?: string
          favorite?: boolean
          id?: string
          unit_code: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_level?: number
          cards_count?: number
          created_at?: string
          equipped_skin_id?: string
          favorite?: boolean
          id?: string
          unit_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cards_unit_code_fkey"
            columns: ["unit_code"]
            isOneToOne: false
            referencedRelation: "units_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_chest_slots: {
        Row: {
          arena_tier: number
          chest_type: string
          created_at: string
          id: string
          queued_for_auto_unlock: boolean
          slot_index: number
          status: string
          unlock_completes_at: string | null
          unlock_duration_seconds: number
          unlock_started_at: string | null
          user_id: string
        }
        Insert: {
          arena_tier?: number
          chest_type: string
          created_at?: string
          id?: string
          queued_for_auto_unlock?: boolean
          slot_index: number
          status?: string
          unlock_completes_at?: string | null
          unlock_duration_seconds: number
          unlock_started_at?: string | null
          user_id: string
        }
        Update: {
          arena_tier?: number
          chest_type?: string
          created_at?: string
          id?: string
          queued_for_auto_unlock?: boolean
          slot_index?: number
          status?: string
          unlock_completes_at?: string | null
          unlock_duration_seconds?: number
          unlock_started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_chest_slots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_commanders: {
        Row: {
          bonding_level: number
          bonding_xp: number
          clutch_wins_count: number
          commander_cards_count: number
          commander_id: string
          commander_level: number
          cop_used_count: number
          equipped_bubble_shape: string
          equipped_skin_id: string
          equipped_stamp_id: string
          id: string
          is_favorite: boolean
          last_played_at: string | null
          matches_played: number
          scop_used_count: number
          unlocked_at: string
          unlocked_dialogue_tier: number
          user_id: string
          victories_count: number
        }
        Insert: {
          bonding_level?: number
          bonding_xp?: number
          clutch_wins_count?: number
          commander_cards_count?: number
          commander_id: string
          commander_level?: number
          cop_used_count?: number
          equipped_bubble_shape?: string
          equipped_skin_id?: string
          equipped_stamp_id?: string
          id?: string
          is_favorite?: boolean
          last_played_at?: string | null
          matches_played?: number
          scop_used_count?: number
          unlocked_at?: string
          unlocked_dialogue_tier?: number
          user_id: string
          victories_count?: number
        }
        Update: {
          bonding_level?: number
          bonding_xp?: number
          clutch_wins_count?: number
          commander_cards_count?: number
          commander_id?: string
          commander_level?: number
          cop_used_count?: number
          equipped_bubble_shape?: string
          equipped_skin_id?: string
          equipped_stamp_id?: string
          id?: string
          is_favorite?: boolean
          last_played_at?: string | null
          matches_played?: number
          scop_used_count?: number
          unlocked_at?: string
          unlocked_dialogue_tier?: number
          user_id?: string
          victories_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_commanders_commander_id_fkey"
            columns: ["commander_id"]
            isOneToOne: false
            referencedRelation: "commanders_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_commanders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_cosmetics: {
        Row: {
          category: string
          cosmetic_id: string
          id: string
          is_equipped: boolean
          source: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          category?: string
          cosmetic_id: string
          id?: string
          is_equipped?: boolean
          source?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          category?: string
          cosmetic_id?: string
          id?: string
          is_equipped?: boolean
          source?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cosmetics_cosmetic_id_fkey"
            columns: ["cosmetic_id"]
            isOneToOne: false
            referencedRelation: "cosmetics_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_cosmetics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_decks: {
        Row: {
          commander_id: string
          deck_name: string
          id: string
          is_active: boolean
          slot_index: number
          unit_codes: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          commander_id: string
          deck_name?: string
          id?: string
          is_active?: boolean
          slot_index: number
          unit_codes: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          commander_id?: string
          deck_name?: string
          id?: string
          is_active?: boolean
          slot_index?: number
          unit_codes?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_decks_commander_id_fkey"
            columns: ["commander_id"]
            isOneToOne: false
            referencedRelation: "commanders_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_decks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_industrial_inventory: {
        Row: {
          campaign_fuel: number
          corporate_specialization: string
          last_harvest_at: string
          raw_iron: number
          raw_rare_earth: number
          raw_stone: number
          refined_concrete: number
          refined_microchip: number
          refined_steel: number
          tech_scrap: number
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_fuel?: number
          corporate_specialization?: string
          last_harvest_at?: string
          raw_iron?: number
          raw_rare_earth?: number
          raw_stone?: number
          refined_concrete?: number
          refined_microchip?: number
          refined_steel?: number
          tech_scrap?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_fuel?: number
          corporate_specialization?: string
          last_harvest_at?: string
          raw_iron?: number
          raw_rare_earth?: number
          raw_stone?: number
          refined_concrete?: number
          refined_microchip?: number
          refined_steel?: number
          tech_scrap?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_industrial_inventory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_industrial_plots: {
        Row: {
          created_at: string
          enterprise_type: string
          id: string
          plot_index: number
          reconfiguration_target: string | null
          status: string
          tier: number
          updated_at: string
          user_id: string
          work_completes_at: string | null
          work_started_at: string | null
        }
        Insert: {
          created_at?: string
          enterprise_type: string
          id?: string
          plot_index: number
          reconfiguration_target?: string | null
          status?: string
          tier?: number
          updated_at?: string
          user_id: string
          work_completes_at?: string | null
          work_started_at?: string | null
        }
        Update: {
          created_at?: string
          enterprise_type?: string
          id?: string
          plot_index?: number
          reconfiguration_target?: string | null
          status?: string
          tier?: number
          updated_at?: string
          user_id?: string
          work_completes_at?: string | null
          work_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_industrial_plots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_patents: {
        Row: {
          id: string
          patent_code: string
          tier: number
          unlocked_at: string
          user_id: string
        }
        Insert: {
          id?: string
          patent_code: string
          tier?: number
          unlocked_at?: string
          user_id: string
        }
        Update: {
          id?: string
          patent_code?: string
          tier?: number
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_patents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quest_progress: {
        Row: {
          assigned_at: string
          current_value: number
          expires_at: string | null
          id: string
          is_claimed: boolean
          is_completed: boolean
          quest_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          current_value?: number
          expires_at?: string | null
          id?: string
          is_claimed?: boolean
          is_completed?: boolean
          quest_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          current_value?: number
          expires_at?: string | null
          id?: string
          is_claimed?: boolean
          is_completed?: boolean
          quest_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quest_progress_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quest_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_relationships: {
        Row: {
          created_at: string
          relation_type: string
          target_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          relation_type: string
          target_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          relation_type?: string
          target_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_relationships_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_relationships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stranded_cargo: {
        Row: {
          stranded_fuel: number
          stranded_iron: number
          stranded_rare_earth: number
          stranded_stone: number
          updated_at: string
          user_id: string
        }
        Insert: {
          stranded_fuel?: number
          stranded_iron?: number
          stranded_rare_earth?: number
          stranded_stone?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          stranded_fuel?: number
          stranded_iron?: number
          stranded_rare_earth?: number
          stranded_stone?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stranded_cargo_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_unit_hangar: {
        Row: {
          clan_id: string | null
          created_at: string
          hp: number
          id: string
          level: number
          location_province_id: string | null
          quantity: number
          tier: number
          unit_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clan_id?: string | null
          created_at?: string
          hp?: number
          id?: string
          level?: number
          location_province_id?: string | null
          quantity?: number
          tier?: number
          unit_code: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clan_id?: string | null
          created_at?: string
          hp?: number
          id?: string
          level?: number
          location_province_id?: string | null
          quantity?: number
          tier?: number
          unit_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_unit_hangar_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_unit_hangar_location_province_id_fkey"
            columns: ["location_province_id"]
            isOneToOne: false
            referencedRelation: "world_provinces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_unit_hangar_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_unlocks: {
        Row: {
          acquisition_method: string
          id: string
          item_id: string
          item_type: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          acquisition_method: string
          id?: string
          item_id: string
          item_type: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          acquisition_method?: string
          id?: string
          item_id?: string
          item_type?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_unlocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_war_room_progress: {
        Row: {
          best_turns: number
          commander_used_id: string
          completed_at: string
          first_clear_claimed: boolean
          id: string
          mission_id: string
          power_score: number
          rank_grade: string
          s_rank_reward_claimed: boolean
          speed_score: number
          technique_score: number
          total_score: number
          user_id: string
        }
        Insert: {
          best_turns: number
          commander_used_id: string
          completed_at?: string
          first_clear_claimed?: boolean
          id?: string
          mission_id: string
          power_score: number
          rank_grade: string
          s_rank_reward_claimed?: boolean
          speed_score: number
          technique_score: number
          total_score: number
          user_id: string
        }
        Update: {
          best_turns?: number
          commander_used_id?: string
          completed_at?: string
          first_clear_claimed?: boolean
          id?: string
          mission_id?: string
          power_score?: number
          rank_grade?: string
          s_rank_reward_claimed?: boolean
          speed_score?: number
          technique_score?: number
          total_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_war_room_progress_commander_used_id_fkey"
            columns: ["commander_used_id"]
            isOneToOne: false
            referencedRelation: "commanders_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_war_room_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      world_countries: {
        Row: {
          continent: string
          coordinates: Json
          created_at: string
          defense_doctrine: string
          iso_code: string
          name: string
        }
        Insert: {
          continent: string
          coordinates?: Json
          created_at?: string
          defense_doctrine?: string
          iso_code: string
          name: string
        }
        Update: {
          continent?: string
          coordinates?: Json
          created_at?: string
          defense_doctrine?: string
          iso_code?: string
          name?: string
        }
        Relationships: []
      }
      world_provinces: {
        Row: {
          base_terrain: string
          building_slots: number
          country_iso: string
          created_at: string
          height: number
          id: string
          is_capital: boolean
          is_capturable: boolean
          name: string
          native_weather: string
          pos_x: number
          pos_y: number
          resource_multiplier: number
          width: number
        }
        Insert: {
          base_terrain: string
          building_slots?: number
          country_iso: string
          created_at?: string
          height?: number
          id: string
          is_capital?: boolean
          is_capturable?: boolean
          name: string
          native_weather: string
          pos_x?: number
          pos_y?: number
          resource_multiplier?: number
          width?: number
        }
        Update: {
          base_terrain?: string
          building_slots?: number
          country_iso?: string
          created_at?: string
          height?: number
          id?: string
          is_capital?: boolean
          is_capturable?: boolean
          name?: string
          native_weather?: string
          pos_x?: number
          pos_y?: number
          resource_multiplier?: number
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "world_provinces_country_iso_fkey"
            columns: ["country_iso"]
            isOneToOne: false
            referencedRelation: "world_countries"
            referencedColumns: ["iso_code"]
          },
        ]
      }
    }
      territorial_battle_sessions: {
        Row: {
          attacker_clan_id: string
          attacker_commander_id: string
          concluded_at: string | null
          created_at: string
          defender_clan_id: string | null
          defender_commander_id: string | null
          handshake_expires_at: string
          id: string
          mode: string
          region_id: string
          status: string
        }
        Insert: {
          attacker_clan_id: string
          attacker_commander_id: string
          concluded_at?: string | null
          created_at?: string
          defender_clan_id?: string | null
          defender_commander_id?: string | null
          handshake_expires_at?: string
          id?: string
          mode?: string
          region_id: string
          status?: string
        }
        Update: {
          attacker_clan_id?: string
          attacker_commander_id?: string
          concluded_at?: string | null
          created_at?: string
          defender_clan_id?: string | null
          defender_commander_id?: string | null
          handshake_expires_at?: string
          id?: string
          mode?: string
          region_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "territorial_battle_sessions_attacker_clan_id_fkey"
            columns: ["attacker_clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territorial_battle_sessions_defender_clan_id_fkey"
            columns: ["defender_clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
      territorial_vulnerability_windows: {
        Row: {
          clan_id: string
          cooldown_until_utc: string
          created_at: string
          is_active: boolean
          region_id: string
          updated_at: string
          window_end_utc: string
          window_start_utc: string
        }
        Insert: {
          clan_id: string
          cooldown_until_utc?: string
          created_at?: string
          is_active?: boolean
          region_id: string
          updated_at?: string
          window_end_utc?: string
          window_start_utc?: string
        }
        Update: {
          clan_id?: string
          cooldown_until_utc?: string
          created_at?: string
          is_active?: boolean
          region_id?: string
          updated_at?: string
          window_end_utc?: string
          window_start_utc?: string
        }
        Relationships: []
      }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_industrial_plot: { Args: { p_plot_index: number }; Returns: Json }
      apply_season_trophy_reset: { Args: never; Returns: Json }
      award_match_rewards: {
        Args: {
          p_end_reason: string
          p_final_stats: Json
          p_match_id: string
          p_winner_id: string
        }
        Returns: Json
      }
      calculate_and_apply_territorial_upkeep: {
        Args: { p_clan_id: string }
        Returns: Json
      }
      calculate_elo_delta: {
        Args: {
          p_arena_tier: number
          p_is_victory: boolean
          p_opponent_trophies: number
          p_player_trophies: number
        }
        Returns: number
      }
      calculate_required_xp: { Args: { p_level: number }; Returns: number }
      calculate_trophy_exchange: {
        Args: {
          p_arena_tier: number
          p_is_victory: boolean
          p_opponent_trophies: number
          p_player_trophies: number
        }
        Returns: number
      }
      calculate_underdog_handicap: {
        Args: {
          p_base_credits: number
          p_base_trophies: number
          p_is_victory: boolean
          p_opponent_trophies: number
          p_opponent_wapl: number
          p_player_trophies: number
          p_player_wapl: number
        }
        Returns: Json
      }
      cancel_matchmaking_queue: { Args: never; Returns: Json }
      claim_airdrop: {
        Args: { p_airdrop_id: string; p_match_id: string; p_unit_id: string }
        Returns: Json
      }
      claim_chest_reward: { Args: { p_slot_index: number }; Returns: Json }
      claim_counter_offensive_cargo: {
        Args: { p_product_id: string }
        Returns: Json
      }
      cron_process_legendary_trophy_decay: { Args: never; Returns: Json }
      deploy_reinforcements_to_battle: {
        Args: {
          p_current_turn: number
          p_match_id: string
          p_player_id: string
          p_unit_hangar_id: string
        }
        Returns: Json
      }
      enqueue_and_matchmake: {
        Args: { p_game_mode: string; p_map_id?: string }
        Returns: Json
      }
      equip_unit_skin: {
        Args: { p_skin_id: string; p_unit_code: string; p_user_id: string }
        Returns: Json
      }
      evaluate_match_tilt_and_offer: {
        Args: { p_match_id: string; p_player_id: string }
        Returns: Json
      }
      execute_p2p_market_transaction: {
        Args: { p_order_id: string }
        Returns: Json
      }
      execute_p2p_purchase: { Args: { p_listing_id: string }; Returns: Json }
      execute_territory_attack_declaration: {
        Args: {
          p_attacker_clan_id: string
          p_origin_province_id: string
          p_target_province_id: string
        }
        Returns: Json
      }
      fulfill_order_gems: {
        Args: {
          p_amount_cents: number
          p_gems_amount: number
          p_product_sku: string
          p_stripe_session_id: string
          p_user_id: string
        }
        Returns: Json
      }
      fulfill_stale_p2p_orders: { Args: never; Returns: Json }
      grant_match_rewards:
        | {
            Args: {
              p_cities_captured_p1?: number
              p_cities_captured_p2?: number
              p_match_id: string
              p_units_destroyed_p1?: number
              p_units_destroyed_p2?: number
              p_winner_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_difficulty?: string
              p_game_mode: string
              p_is_victory: boolean
              p_match_id: string
              p_properties_captured: number
              p_turns_count: number
              p_units_destroyed: number
              p_user_id: string
            }
            Returns: Json
          }
      handle_turn_timeout: { Args: { p_match_id: string }; Returns: Json }
      harvest_industrial_resources: { Args: never; Returns: Json }
      harvest_industrial_territory: { Args: never; Returns: Json }
      join_matchmaking_queue: {
        Args: {
          p_commander_id: string
          p_game_mode: string
          p_preferred_theater?: string
        }
        Returns: Json
      }
      join_mirror_duel_queue: { Args: { p_co_id: string }; Returns: Json }
      join_waiting_match: { Args: { p_room_code: string }; Returns: Json }
      pay_dishonor_embargo_fee: {
        Args: { p_clan_id: string; p_currency: string }
        Returns: Json
      }
      process_post_match_near_miss: {
        Args: {
          p_loser_id: string
          p_loser_unit_level: number
          p_match_id: string
          p_target_unit_id: string
          p_winner_id: string
          p_winner_surviving_hp: number
          p_winner_unit_level: number
        }
        Returns: Json
      }
      purchase_cosmetic_item: {
        Args: {
          p_currency: string
          p_item_id: string
          p_item_type: string
          p_price: number
          p_user_id: string
        }
        Returns: Json
      }
      purchase_shop_offer: { Args: { p_offer_id: string }; Returns: Json }
      reconfigure_industrial_plot: {
        Args: {
          p_action: string
          p_plot_index: number
          p_target_enterprise: string
        }
        Returns: Json
      }
      rpc_contribute_territory_points: {
        Args: {
          p_is_coop_2v2: boolean
          p_is_victory: boolean
          p_sector_id: number
        }
        Returns: Json
      }
      rpc_credit_competitive_activity: {
        Args: { p_user_id: string }
        Returns: Json
      }
      rpc_donate_cards: {
        Args: { p_amount: number; p_request_id: string }
        Returns: Json
      }
      rpc_get_contextual_bark: {
        Args: {
          p_commander_id: string
          p_trigger_context: string
          p_trigger_phase?: string
        }
        Returns: Json
      }
      rpc_get_match_snapshot: { Args: { p_match_id: string }; Returns: Json }
      rpc_purchase_clan_buff: { Args: { p_buff_id: string }; Returns: Json }
      rpc_reconnect_match_state: {
        Args: { p_match_id: string; p_user_id: string }
        Returns: Json
      }
      rpc_request_card_donation: {
        Args: { p_card_id: string; p_rarity: string }
        Returns: Json
      }
      rpc_rescue_embargoed_comrade: {
        Args: { p_embargoed_user_id: string }
        Returns: Json
      }
      rpc_spin_daily_wheel: { Args: { p_user_id: string }; Returns: Json }
      scrap_blueprints: {
        Args: { p_quantity: number; p_unit_id: string }
        Returns: Json
      }
      settle_ranked_match_result: {
        Args: { p_loser_id: string; p_match_id: string; p_winner_id: string }
        Returns: Json
      }
      start_chest_unlock: { Args: { p_slot_index: number }; Returns: Json }
      transmute_tech_scrap: { Args: { p_batches?: number }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
