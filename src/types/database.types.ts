export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MovementType = 'foot' | 'mech' | 'wheels' | 'treads' | 'air' | 'sea';
export type UnitCategory = 'infantry' | 'vehicle' | 'indirect' | 'aircraft' | 'naval';
export type MatchStatus = 'waiting' | 'in_progress' | 'finished' | 'abandoned';
export type GameMode =
  | 'blitz_skirmish'
  | 'grand_campaign'
  | 'two_vs_two'
  | 'vs_bot'
  | 'mirror_duel'
  | 'pvp_realtime'
  | 'pvp_async';
export type BotDifficulty = 'easy' | 'normal' | 'hard';
export type EndReason =
  | 'hq_captured'
  | 'army_wiped'
  | 'resignation'
  | 'timeout'
  | 'turn_limit_tiebreaker'
  | 'sudden_death';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          account_level: number;
          current_xp: number;
          battle_credits: number;
          command_gems: number;
          elo_rating: number;
          trophies_count: number;
          highest_trophies: number;
          average_turn_seconds: number;
          pte_profile: 'blitz' | 'standard' | 'calculated';
          clan_id: string | null;
          selected_commander_id: string;
          equipped_deck: Json;
          safeguard_items_count: number;
          is_safeguard_equipped: boolean;
          last_daily_safeguard_claim: string | null;
          current_win_streak: number;
          highest_win_streak: number;
          total_matches_played: number;
          total_victories: number;
          daily_offline_matches_count: number;
          last_offline_match_date: string;
          equipped_loadout: Json;
          equipped_cosmetics: Json;
          muted_until: string | null;
          is_chat_banned: boolean;
          decay_bank_days: number;
          last_decay_processed_at: string | null;
          last_competitive_match_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          account_level?: number;
          current_xp?: number;
          battle_credits?: number;
          command_gems?: number;
          elo_rating?: number;
          trophies_count?: number;
          highest_trophies?: number;
          average_turn_seconds?: number;
          pte_profile?: 'blitz' | 'standard' | 'calculated';
          clan_id?: string | null;
          selected_commander_id?: string;
          equipped_deck?: Json;
          safeguard_items_count?: number;
          is_safeguard_equipped?: boolean;
          last_daily_safeguard_claim?: string | null;
          current_win_streak?: number;
          highest_win_streak?: number;
          total_matches_played?: number;
          total_victories?: number;
          daily_offline_matches_count?: number;
          last_offline_match_date?: string;
          equipped_loadout?: Json;
          equipped_cosmetics?: Json;
          muted_until?: string | null;
          is_chat_banned?: boolean;
          decay_bank_days?: number;
          last_decay_processed_at?: string | null;
          last_competitive_match_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          avatar_url?: string | null;
          account_level?: number;
          current_xp?: number;
          battle_credits?: number;
          command_gems?: number;
          elo_rating?: number;
          trophies_count?: number;
          highest_trophies?: number;
          average_turn_seconds?: number;
          pte_profile?: 'blitz' | 'standard' | 'calculated';
          clan_id?: string | null;
          selected_commander_id?: string;
          equipped_deck?: Json;
          safeguard_items_count?: number;
          is_safeguard_equipped?: boolean;
          last_daily_safeguard_claim?: string | null;
          current_win_streak?: number;
          highest_win_streak?: number;
          total_matches_played?: number;
          total_victories?: number;
          daily_offline_matches_count?: number;
          last_offline_match_date?: string;
          equipped_loadout?: Json;
          equipped_cosmetics?: Json;
          muted_until?: string | null;
          is_chat_banned?: boolean;
          decay_bank_days?: number;
          last_decay_processed_at?: string | null;
          last_competitive_match_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      commanders_catalog: {
        Row: {
          id: string;
          codename: string;
          military_rank: string;
          faction: string;
          unlock_method: string;
          unlock_season: string | null;
          is_revealed: boolean;
          cop_name: string | null;
          cop_stars: number | null;
          scop_name: string;
          scop_stars: number;
          d2d_summary: string;
          cop_summary: string | null;
          scop_summary: string;
          default_bubble_shape: string;
          default_onomatopoeia: string | null;
          personality_archetype: string;
          cost_modifier_percent: number;
          repair_bonus_hp: number;
          vision_bonus: number;
          income_bonus_per_property: number;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id: string;
          codename: string;
          military_rank: string;
          faction: string;
          unlock_method?: string;
          unlock_season?: string | null;
          is_revealed?: boolean;
          cop_name?: string | null;
          cop_stars?: number | null;
          scop_name: string;
          scop_stars: number;
          d2d_summary: string;
          cop_summary?: string | null;
          scop_summary: string;
          default_bubble_shape?: string;
          default_onomatopoeia?: string | null;
          personality_archetype?: string;
          cost_modifier_percent?: number;
          repair_bonus_hp?: number;
          vision_bonus?: number;
          income_bonus_per_property?: number;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          codename?: string;
          military_rank?: string;
          faction?: string;
          unlock_method?: string;
          unlock_season?: string | null;
          is_revealed?: boolean;
          cop_name?: string | null;
          cop_stars?: number | null;
          scop_name?: string;
          scop_stars?: number;
          d2d_summary?: string;
          cop_summary?: string | null;
          scop_summary?: string;
          default_bubble_shape?: string;
          default_onomatopoeia?: string | null;
          personality_archetype?: string;
          cost_modifier_percent?: number;
          repair_bonus_hp?: number;
          vision_bonus?: number;
          income_bonus_per_property?: number;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };

      user_commanders: {
        Row: {
          id: string;
          user_id: string;
          commander_id: string;
          bonding_level: number;
          bonding_xp: number;
          is_favorite: boolean;
          matches_played: number;
          matches_won: number;
          unlocked_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          commander_id: string;
          bonding_level?: number;
          bonding_xp?: number;
          is_favorite?: boolean;
          matches_played?: number;
          matches_won?: number;
          unlocked_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          commander_id?: string;
          bonding_level?: number;
          bonding_xp?: number;
          is_favorite?: boolean;
          matches_played?: number;
          matches_won?: number;
          unlocked_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      commander_bonding_rewards_catalog: {
        Row: {
          bonding_level: number;
          required_total_xp: number;
          reward_type: string;
          reward_cosmetic_id: string | null;
          description: string;
        };
        Insert: {
          bonding_level: number;
          required_total_xp: number;
          reward_type: string;
          reward_cosmetic_id?: string | null;
          description: string;
        };
        Update: {
          bonding_level?: number;
          required_total_xp?: number;
          reward_type?: string;
          reward_cosmetic_id?: string | null;
          description?: string;
        };
        Relationships: [];
      };

      bark_dialogue_templates: {
        Row: {
          id: string;
          commander_id: string;
          trigger_context: string;
          trigger_phase: string;
          bubble_shape: string;
          onomatopoeia_stamp: string | null;
          comic_vignette_pose: string;
          affinity_level_min: number;
          priority_weight: number;
          cooldown_turns: number;
          required_condition_json: Json;
          dialogue_template_text: string;
          created_at: string;
        };
        Insert: {
          id: string;
          commander_id: string;
          trigger_context: string;
          trigger_phase?: string;
          bubble_shape?: string;
          onomatopoeia_stamp?: string | null;
          comic_vignette_pose?: string;
          affinity_level_min?: number;
          priority_weight?: number;
          cooldown_turns?: number;
          required_condition_json?: Json;
          dialogue_template_text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          commander_id?: string;
          trigger_context?: string;
          trigger_phase?: string;
          bubble_shape?: string;
          onomatopoeia_stamp?: string | null;
          comic_vignette_pose?: string;
          affinity_level_min?: number;
          priority_weight?: number;
          cooldown_turns?: number;
          required_condition_json?: Json;
          dialogue_template_text?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      user_cards: {
        Row: {
          id: string;
          user_id: string;
          unit_code: string;
          card_level: number;
          cards_count: number;
          equipped_skin_id: string;
          favorite: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          unit_code: string;
          card_level?: number;
          cards_count?: number;
          equipped_skin_id?: string;
          favorite?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          unit_code?: string;
          card_level?: number;
          cards_count?: number;
          equipped_skin_id?: string;
          favorite?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      user_cosmetics: {
        Row: {
          id: string;
          user_id: string;
          cosmetic_id: string;
          category: string;
          is_equipped: boolean;
          source: string;
          unlocked_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          cosmetic_id: string;
          category?: string;
          is_equipped?: boolean;
          source?: string;
          unlocked_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          cosmetic_id?: string;
          category?: string;
          is_equipped?: boolean;
          source?: string;
          unlocked_at?: string;
        };
        Relationships: [];
      };

      user_chest_slots: {
        Row: {
          id: string;
          user_id: string;
          slot_index: number;
          chest_type: 'wood' | 'iron' | 'armored' | 'legendary';
          arena_tier: number;
          status: 'locked' | 'unlocking' | 'ready' | 'empty';
          unlock_duration_seconds: number;
          unlock_started_at: string | null;
          unlock_completes_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          slot_index: number;
          chest_type: 'wood' | 'iron' | 'armored' | 'legendary';
          arena_tier?: number;
          status?: 'locked' | 'unlocking' | 'ready' | 'empty';
          unlock_duration_seconds: number;
          unlock_started_at?: string | null;
          unlock_completes_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          slot_index?: number;
          chest_type?: 'wood' | 'iron' | 'armored' | 'legendary';
          arena_tier?: number;
          status?: 'locked' | 'unlocking' | 'ready' | 'empty';
          unlock_duration_seconds?: number;
          unlock_started_at?: string | null;
          unlock_completes_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      user_industrial_inventory: {
        Row: {
          user_id: string;
          raw_iron: number;
          raw_stone: number;
          raw_rare_earth: number;
          refined_steel: number;
          refined_concrete: number;
          refined_microchip: number;
          tech_scrap: number;
          campaign_fuel: number;
          corporate_specialization: string;
          last_harvest_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          raw_iron?: number;
          raw_stone?: number;
          raw_rare_earth?: number;
          refined_steel?: number;
          refined_concrete?: number;
          refined_microchip?: number;
          tech_scrap?: number;
          campaign_fuel?: number;
          corporate_specialization?: string;
          last_harvest_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          raw_iron?: number;
          raw_stone?: number;
          raw_rare_earth?: number;
          refined_steel?: number;
          refined_concrete?: number;
          refined_microchip?: number;
          tech_scrap?: number;
          campaign_fuel?: number;
          corporate_specialization?: string;
          last_harvest_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      user_industrial_plots: {
        Row: {
          id: string;
          user_id: string;
          plot_index: number;
          enterprise_type: string;
          tier: number;
          status: 'active' | 'clearing' | 'reconfiguring';
          reconfiguration_target: string | null;
          work_started_at: string | null;
          work_completes_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plot_index: number;
          enterprise_type: string;
          tier?: number;
          status?: 'active' | 'clearing' | 'reconfiguring';
          reconfiguration_target?: string | null;
          work_started_at?: string | null;
          work_completes_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plot_index?: number;
          enterprise_type?: string;
          tier?: number;
          status?: 'active' | 'clearing' | 'reconfiguring';
          reconfiguration_target?: string | null;
          work_started_at?: string | null;
          work_completes_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      user_stranded_cargo: {
        Row: {
          user_id: string;
          stranded_iron: number;
          stranded_stone: number;
          stranded_rare_earth: number;
          stranded_fuel: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          stranded_iron?: number;
          stranded_stone?: number;
          stranded_rare_earth?: number;
          stranded_fuel?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          stranded_iron?: number;
          stranded_stone?: number;
          stranded_rare_earth?: number;
          stranded_fuel?: number;
          updated_at?: string;
        };
        Relationships: [];
      };

      industrial_refining_jobs: {
        Row: {
          id: string;
          user_id: string;
          building_type: string;
          input_resource: string;
          input_amount: number;
          output_resource: string;
          output_amount: number;
          started_at: string;
          completes_at: string;
          is_boosted_with_fuel: boolean;
          is_claimed: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          building_type: string;
          input_resource: string;
          input_amount: number;
          output_resource: string;
          output_amount: number;
          started_at?: string;
          completes_at: string;
          is_boosted_with_fuel?: boolean;
          is_claimed?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          building_type?: string;
          input_resource?: string;
          input_amount?: number;
          output_resource?: string;
          output_amount?: number;
          started_at?: string;
          completes_at?: string;
          is_boosted_with_fuel?: boolean;
          is_claimed?: boolean;
        };
        Relationships: [];
      };

      p2p_price_reference: {
        Row: {
          resource_type: string;
          pmm_24h: number;
          min_price_collar: number;
          max_price_collar: number;
          last_recalculated_at: string;
        };
        Insert: {
          resource_type: string;
          pmm_24h: number;
          min_price_collar: number;
          max_price_collar: number;
          last_recalculated_at?: string;
        };
        Update: {
          resource_type?: string;
          pmm_24h?: number;
          min_price_collar?: number;
          max_price_collar?: number;
          last_recalculated_at?: string;
        };
        Relationships: [];
      };

      p2p_market_listings: {
        Row: {
          id: string;
          seller_id: string;
          resource_type: string;
          quantity: number;
          price_per_unit: number;
          total_price: number;
          status: 'active' | 'sold' | 'cancelled' | 'expired';
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          resource_type: string;
          quantity: number;
          price_per_unit: number;
          total_price: number;
          status?: 'active' | 'sold' | 'cancelled' | 'expired';
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          seller_id?: string;
          resource_type?: string;
          quantity?: number;
          price_per_unit?: number;
          total_price?: number;
          status?: 'active' | 'sold' | 'cancelled' | 'expired';
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      mirror_duel_queue: {
        Row: {
          user_id: string;
          co_commander_id: string;
          trophies: number;
          queued_at: string;
          matched_match_id: string | null;
        };
        Insert: {
          user_id: string;
          co_commander_id: string;
          trophies?: number;
          queued_at?: string;
          matched_match_id?: string | null;
        };
        Update: {
          user_id?: string;
          co_commander_id?: string;
          trophies?: number;
          queued_at?: string;
          matched_match_id?: string | null;
        };
        Relationships: [];
      };

      match_airdrop_events: {
        Row: {
          id: string;
          match_id: string;
          turn_number: number;
          player_id: string | null;
          unit_id: string;
          reward_type: 'funds' | 'co_power' | 'blueprints' | 'gems';
          reward_payload: Json;
          tile_x: number;
          tile_y: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          turn_number: number;
          player_id?: string | null;
          unit_id: string;
          reward_type: 'funds' | 'co_power' | 'blueprints' | 'gems';
          reward_payload: Json;
          tile_x: number;
          tile_y: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          turn_number?: number;
          player_id?: string | null;
          unit_id?: string;
          reward_type?: 'funds' | 'co_power' | 'blueprints' | 'gems';
          reward_payload?: Json;
          tile_x?: number;
          tile_y?: number;
          created_at?: string;
        };
        Relationships: [];
      };

      tilt_emergency_offers: {
        Row: {
          id: string;
          user_id: string;
          triggered_by_match_id: string;
          target_unit_id: string;
          offer_price_usd: number;
          reward_cards_amount: number;
          reward_steel_amount: number;
          stripe_session_id: string | null;
          status: 'active' | 'purchased' | 'expired';
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          triggered_by_match_id: string;
          target_unit_id: string;
          offer_price_usd?: number;
          reward_cards_amount?: number;
          reward_steel_amount?: number;
          stripe_session_id?: string | null;
          status?: 'active' | 'purchased' | 'expired';
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          triggered_by_match_id?: string;
          target_unit_id?: string;
          offer_price_usd?: number;
          reward_cards_amount?: number;
          reward_steel_amount?: number;
          stripe_session_id?: string | null;
          status?: 'active' | 'purchased' | 'expired';
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      player_tactical_behavior_profile: {
        Row: {
          user_id: string;
          tilt_streak_count: number;
          current_loss_streak: number;
          average_turn_seconds: number;
          most_lost_unit_id: string | null;
          last_tilt_offer_at: string | null;
          counter_offensive_offer: Json | null;
          counter_offensive_expires_at: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          tilt_streak_count?: number;
          current_loss_streak?: number;
          average_turn_seconds?: number;
          most_lost_unit_id?: string | null;
          last_tilt_offer_at?: string | null;
          counter_offensive_offer?: Json | null;
          counter_offensive_expires_at?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          tilt_streak_count?: number;
          current_loss_streak?: number;
          average_turn_seconds?: number;
          most_lost_unit_id?: string | null;
          last_tilt_offer_at?: string | null;
          counter_offensive_offer?: Json | null;
          counter_offensive_expires_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      clans: {
        Row: {
          id: string;
          name: string;
          tag: string;
          badge_icon: string;
          leader_id: string;
          current_war_tier: number;
          active_war_participants_today: number;
          trophies_count: number;
          members_count: number;
          max_members: number;
          treasury_gold: number;
          treasury_steel: number;
          treasury_gems: number;
          active_war_buffs: Json;
          priority_sector_id: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          tag: string;
          badge_icon?: string;
          leader_id: string;
          current_war_tier?: number;
          active_war_participants_today?: number;
          trophies_count?: number;
          members_count?: number;
          max_members?: number;
          treasury_gold?: number;
          treasury_steel?: number;
          treasury_gems?: number;
          active_war_buffs?: Json;
          priority_sector_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          tag?: string;
          badge_icon?: string;
          leader_id?: string;
          current_war_tier?: number;
          active_war_participants_today?: number;
          trophies_count?: number;
          members_count?: number;
          max_members?: number;
          treasury_gold?: number;
          treasury_steel?: number;
          treasury_gems?: number;
          active_war_buffs?: Json;
          priority_sector_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      clan_members: {
        Row: {
          id: string;
          clan_id: string;
          user_id: string;
          role: 'leader' | 'officer' | 'veteran' | 'recruit';
          daily_war_matches_played: number;
          daily_war_victories: number;
          has_claimed_daily_chest: boolean;
          joined_at: string;
        };
        Insert: {
          id?: string;
          clan_id: string;
          user_id: string;
          role?: 'leader' | 'officer' | 'veteran' | 'recruit';
          daily_war_matches_played?: number;
          daily_war_victories?: number;
          has_claimed_daily_chest?: boolean;
          joined_at?: string;
        };
        Update: {
          id?: string;
          clan_id?: string;
          user_id?: string;
          role?: 'leader' | 'officer' | 'veteran' | 'recruit';
          daily_war_matches_played?: number;
          daily_war_victories?: number;
          has_claimed_daily_chest?: boolean;
          joined_at?: string;
        };
        Relationships: [];
      };

      active_matches: {
        Row: {
          id: string;
          room_code: string;
          player1_id: string;
          player2_id: string | null;
          current_turn_player_id: string;
          status: MatchStatus;
          game_mode: GameMode;
          map_id: string;
          turn_number: number;
          turn_time_limit_sec: number;
          max_turns_limit: number;
          economy_multiplier: number;
          turn_deadline: string;
          winner_id: string | null;
          resigned_player_id: string | null;
          end_reason: EndReason | null;
          is_overtime: boolean;
          overtime_started_at_turn: number | null;
          sudden_death_first_blood_player_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_code: string;
          player1_id: string;
          player2_id?: string | null;
          current_turn_player_id: string;
          status?: MatchStatus;
          game_mode: GameMode;
          map_id: string;
          turn_number?: number;
          turn_time_limit_sec?: number;
          max_turns_limit?: number;
          economy_multiplier?: number;
          turn_deadline: string;
          winner_id?: string | null;
          resigned_player_id?: string | null;
          end_reason?: EndReason | null;
          is_overtime?: boolean;
          overtime_started_at_turn?: number | null;
          sudden_death_first_blood_player_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          room_code?: string;
          player1_id?: string;
          player2_id?: string | null;
          current_turn_player_id?: string;
          status?: MatchStatus;
          game_mode?: GameMode;
          map_id?: string;
          turn_number?: number;
          turn_time_limit_sec?: number;
          max_turns_limit?: number;
          economy_multiplier?: number;
          turn_deadline?: string;
          winner_id?: string | null;
          resigned_player_id?: string | null;
          end_reason?: EndReason | null;
          is_overtime?: boolean;
          overtime_started_at_turn?: number | null;
          sudden_death_first_blood_player_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      match_state: {
        Row: {
          match_id: string;
          grid_width: number;
          grid_height: number;
          tiles: Json;
          units: Json;
          properties: Json;
          airdrops: Json;
          player_funds: Json;
          co_power_gauge: Json;
          fog_of_war_enabled: boolean;
          updated_at: string;
        };
        Insert: {
          match_id: string;
          grid_width: number;
          grid_height: number;
          tiles: Json;
          units: Json;
          properties: Json;
          airdrops?: Json;
          player_funds: Json;
          co_power_gauge: Json;
          fog_of_war_enabled?: boolean;
          updated_at?: string;
        };
        Update: {
          match_id?: string;
          grid_width?: number;
          grid_height?: number;
          tiles?: Json;
          units?: Json;
          properties?: Json;
          airdrops?: Json;
          player_funds?: Json;
          co_power_gauge?: Json;
          fog_of_war_enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      match_history: {
        Row: {
          id: string;
          match_id: string;
          player1_id: string;
          player2_id: string | null;
          winner_id: string | null;
          end_reason: EndReason;
          total_turns: number;
          duration_seconds: number;
          game_mode: string;
          is_tournament_cap_applied: boolean;
          p1_average_deck_level: number;
          p2_average_deck_level: number;
          near_miss_data: Json | null;
          p1_xp_awarded: number;
          p2_xp_awarded: number;
          p1_credits_awarded: number;
          p2_credits_awarded: number;
          final_stats: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          player1_id: string;
          player2_id?: string | null;
          winner_id?: string | null;
          end_reason: EndReason;
          total_turns: number;
          duration_seconds: number;
          game_mode: string;
          is_tournament_cap_applied?: boolean;
          p1_average_deck_level?: number;
          p2_average_deck_level?: number;
          near_miss_data?: Json | null;
          p1_xp_awarded?: number;
          p2_xp_awarded?: number;
          p1_credits_awarded?: number;
          p2_credits_awarded?: number;
          final_stats?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          player1_id?: string;
          player2_id?: string | null;
          winner_id?: string | null;
          end_reason?: EndReason;
          total_turns?: number;
          duration_seconds?: number;
          game_mode?: string;
          is_tournament_cap_applied?: boolean;
          p1_average_deck_level?: number;
          p2_average_deck_level?: number;
          near_miss_data?: Json | null;
          p1_xp_awarded?: number;
          p2_xp_awarded?: number;
          p1_credits_awarded?: number;
          p2_credits_awarded?: number;
          final_stats?: Json;
          created_at?: string;
        };
        Relationships: [];
      };

      units_catalog: {
        Row: {
          id: string;
          display_name: string;
          category: UnitCategory;
          hp_max: number;
          base_attack: number;
          min_range: number;
          max_range: number;
          movement_points: number;
          movement_type: MovementType;
          vision_range: number;
          production_cost_g: number;
          ammo_max: number;
          fuel_max: number;
          required_account_level: number;
          unlock_cost_credits: number;
          is_base_unlocked: boolean;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          category: UnitCategory;
          hp_max?: number;
          base_attack?: number;
          min_range?: number;
          max_range?: number;
          movement_points?: number;
          movement_type: MovementType;
          vision_range?: number;
          production_cost_g?: number;
          ammo_max?: number;
          fuel_max?: number;
          required_account_level?: number;
          unlock_cost_credits?: number;
          is_base_unlocked?: boolean;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          category?: UnitCategory;
          hp_max?: number;
          base_attack?: number;
          min_range?: number;
          max_range?: number;
          movement_points?: number;
          movement_type?: MovementType;
          vision_range?: number;
          production_cost_g?: number;
          ammo_max?: number;
          fuel_max?: number;
          required_account_level?: number;
          unlock_cost_credits?: number;
          is_base_unlocked?: boolean;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };

      cosmetics_catalog: {
        Row: {
          id: string;
          cosmetic_type: string;
          target_entity_id: string | null;
          name: string;
          description: string;
          rarity: string;
          visual_payload: Json;
          is_base_default: boolean;
          is_premium_pass_exclusive: boolean;
          base_price_credits: number | null;
          base_price_gems: number | null;
          created_at: string;
        };
        Insert: {
          id: string;
          cosmetic_type: string;
          target_entity_id?: string | null;
          name: string;
          description: string;
          rarity?: string;
          visual_payload?: Json;
          is_base_default?: boolean;
          is_premium_pass_exclusive?: boolean;
          base_price_credits?: number | null;
          base_price_gems?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          cosmetic_type?: string;
          target_entity_id?: string | null;
          name?: string;
          description?: string;
          rarity?: string;
          visual_payload?: Json;
          is_base_default?: boolean;
          is_premium_pass_exclusive?: boolean;
          base_price_credits?: number | null;
          base_price_gems?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };

      currency_ledger: {
        Row: {
          id: string;
          user_id: string;
          currency: 'credits' | 'gems' | 'refined_steel' | 'refined_concrete' | 'refined_microchip';
          delta: number;
          balance_after: number;
          reason: string;
          reference_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          currency: 'credits' | 'gems' | 'refined_steel' | 'refined_concrete' | 'refined_microchip';
          delta: number;
          balance_after: number;
          reason: string;
          reference_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          currency?: 'credits' | 'gems' | 'refined_steel' | 'refined_concrete' | 'refined_microchip';
          delta?: number;
          balance_after?: number;
          reason?: string;
          reference_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };

      matchmaking_queue: {
        Row: {
          user_id: string;
          game_mode: 'mirror_duel' | 'blitz_skirmish' | 'grand_campaign';
          commander_id: string;
          deck_snapshot: Json;
          preferred_theater: 'land' | 'naval' | 'combined' | 'any';
          trophies: number;
          weighted_power: number;
          queued_at: string;
          matched_match_id: string | null;
          expires_at: string;
        };
        Insert: {
          user_id: string;
          game_mode: 'mirror_duel' | 'blitz_skirmish' | 'grand_campaign';
          commander_id: string;
          deck_snapshot?: Json;
          preferred_theater?: 'land' | 'naval' | 'combined' | 'any';
          trophies?: number;
          weighted_power?: number;
          queued_at?: string;
          matched_match_id?: string | null;
          expires_at?: string;
        };
        Update: {
          user_id?: string;
          game_mode?: 'mirror_duel' | 'blitz_skirmish' | 'grand_campaign';
          commander_id?: string;
          deck_snapshot?: Json;
          preferred_theater?: 'land' | 'naval' | 'combined' | 'any';
          trophies?: number;
          weighted_power?: number;
          queued_at?: string;
          matched_match_id?: string | null;
          expires_at?: string;
        };
        Relationships: [];
      };

      system_economy_config: {
        Row: {
          config_key: string;
          config_value: Json;
          description: string;
          updated_at: string;
        };
        Insert: {
          config_key: string;
          config_value: Json;
          description: string;
          updated_at?: string;
        };
        Update: {
          config_key?: string;
          config_value?: Json;
          description?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      store_products_catalog: {
        Row: {
          id: string;
          name: string;
          category: 'subscription' | 'supply_pack' | 'chest' | 'cosmetic';
          price_usd: number;
          reward_credits: number;
          reward_gems: number;
          reward_blueprints: number;
          reward_steel: number;
          reward_microchips: number;
          reward_concrete: number;
          safeguards_included: number;
          is_active: boolean;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          category: 'subscription' | 'supply_pack' | 'chest' | 'cosmetic';
          price_usd: number;
          reward_credits?: number;
          reward_gems?: number;
          reward_blueprints?: number;
          reward_steel?: number;
          reward_microchips?: number;
          reward_concrete?: number;
          safeguards_included?: number;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: 'subscription' | 'supply_pack' | 'chest' | 'cosmetic';
          price_usd?: number;
          reward_credits?: number;
          reward_gems?: number;
          reward_blueprints?: number;
          reward_steel?: number;
          reward_microchips?: number;
          reward_concrete?: number;
          safeguards_included?: number;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };

      social_config_params: {
        Row: {
          id: string;
          config: Json;
          updated_at: string;
        };
        Insert: {
          id: string;
          config: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          config?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };

      clan_territorial_sectors: {
        Row: {
          id: number;
          sector_name: string;
          theater_type: string;
          controlling_clan_id: string | null;
          total_dp_accumulated: number;
          season_ends_at: string;
          updated_at: string;
        };
        Insert: {
          id: number;
          sector_name: string;
          theater_type: string;
          controlling_clan_id?: string | null;
          total_dp_accumulated?: number;
          season_ends_at: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          sector_name?: string;
          theater_type?: string;
          controlling_clan_id?: string | null;
          total_dp_accumulated?: number;
          season_ends_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      card_donations: {
        Row: {
          id: string;
          clan_id: string;
          requester_user_id: string;
          unit_id: string;
          rarity: 'common' | 'rare' | 'epic';
          amount_requested: number;
          amount_donated: number;
          is_fulfilled: boolean;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          clan_id: string;
          requester_user_id: string;
          unit_id: string;
          rarity: 'common' | 'rare' | 'epic';
          amount_requested: number;
          amount_donated?: number;
          is_fulfilled?: boolean;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          clan_id?: string;
          requester_user_id?: string;
          unit_id?: string;
          rarity?: 'common' | 'rare' | 'epic';
          amount_requested?: number;
          amount_donated?: number;
          is_fulfilled?: boolean;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };

    Functions: {
      grant_match_rewards: {
        Args: {
          p_user_id: string;
          p_match_id: string;
          p_is_victory: boolean;
          p_game_mode?: string;
          p_difficulty?: string;
          p_turns_count?: number;
          p_properties_captured?: number;
          p_units_destroyed?: number;
        };
        Returns: Json;
      };
      scrap_blueprints: {
        Args: {
          p_card_id: string;
          p_amount: number;
        };
        Returns: Json;
      };
      transmute_tech_scrap: {
        Args: {
          p_microchips_to_produce: number;
        };
        Returns: Json;
      };
      calculate_underdog_handicap: {
        Args: {
          p_player_wapl: number;
          p_opponent_wapl: number;
          p_is_victory: boolean;
        };
        Returns: Json;
      };
      claim_counter_offensive_cargo: {
        Args: Record<string, never>;
        Returns: Json;
      };
      rpc_credit_competitive_activity: {
        Args: {
          p_user_id: string;
        };
        Returns: Json;
      };
      join_mirror_duel_queue: {
        Args: { p_co_id: string };
        Returns: Json;
      };
      claim_airdrop: {
        Args: { p_match_id: string; p_airdrop_id: string; p_unit_id: string };
        Returns: Json;
      };
      handle_turn_timeout: {
        Args: { p_match_id: string };
        Returns: Json;
      };
      harvest_industrial_resources: {
        Args: Record<string, never>;
        Returns: Json;
      };
      harvest_industrial_territory: {
        Args: Record<string, never>;
        Returns: Json;
      };
      acquire_industrial_plot: {
        Args: { p_plot_index: number };
        Returns: Json;
      };
      reconfigure_industrial_plot: {
        Args: { p_plot_index: number; p_action: string; p_target_enterprise: string };
        Returns: Json;
      };
      fulfill_stale_p2p_orders: {
        Args: Record<string, never>;
        Returns: Json;
      };
      execute_p2p_purchase: {
        Args: { p_listing_id: string };
        Returns: Json;
      };
      pay_dishonor_embargo_fee: {
        Args: { p_clan_id: string; p_currency: string };
        Returns: Json;
      };
      rpc_get_contextual_bark: {
        Args: {
          p_commander_id: string;
          p_trigger_context: string;
          p_trigger_phase?: string;
        };
        Returns: Json;
      };
      process_post_match_near_miss: {
        Args: {
          p_match_id: string;
          p_loser_id: string;
          p_winner_id: string;
          p_target_unit_id: string;
          p_winner_surviving_hp: number;
          p_winner_unit_level: number;
          p_loser_unit_level: number;
        };
        Returns: Json;
      };
      evaluate_match_tilt_and_offer: {
        Args: { p_match_id: string; p_player_id: string };
        Returns: Json;
      };
      join_matchmaking_queue: {
        Args: { p_game_mode: string; p_commander_id: string; p_preferred_theater?: string };
        Returns: Json;
      };
      cancel_matchmaking_queue: {
        Args: Record<string, never>;
        Returns: Json;
      };
      start_chest_unlock: {
        Args: { p_slot_index: number };
        Returns: Json;
      };
      claim_chest_reward: {
        Args: { p_slot_index: number };
        Returns: Json;
      };
      calculate_elo_delta: {
        Args: { p_player_trophies: number; p_opponent_trophies: number; p_arena_tier: number; p_is_victory: boolean };
        Returns: number;
      };
      settle_ranked_match_result: {
        Args: { p_match_id: string; p_winner_id: string; p_loser_id: string };
        Returns: Json;
      };
      apply_season_trophy_reset: {
        Args: Record<string, never>;
        Returns: Json;
      };
    };
  };
}
