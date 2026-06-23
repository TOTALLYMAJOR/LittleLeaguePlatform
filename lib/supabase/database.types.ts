export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type RowId = string;
type Timestamp = string;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: RowId;
          display_name: string;
          email: string;
          phone: string | null;
          default_role: "admin" | "coach" | "parent";
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id: RowId;
          display_name: string;
          email: string;
          phone?: string | null;
          default_role: "admin" | "coach" | "parent";
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      organizations: {
        Row: {
          id: RowId;
          name: string;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: RowId;
          name: string;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
        Relationships: [];
      };
      organization_memberships: {
        Row: {
          id: RowId;
          organization_id: RowId;
          user_id: RowId;
          role: "admin" | "coach";
          status: "active" | "invited" | "removed";
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: RowId;
          organization_id: RowId;
          user_id: RowId;
          role: "admin" | "coach";
          status?: "active" | "invited" | "removed";
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["organization_memberships"]["Insert"]>;
        Relationships: [];
      };
      seasons: {
        Row: {
          id: RowId;
          organization_id: RowId;
          name: string;
          status: "active" | "archived";
          starts_at: Timestamp;
          ends_at: Timestamp;
          archived_at: Timestamp | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: RowId;
          organization_id: RowId;
          name: string;
          status: "active" | "archived";
          starts_at: Timestamp;
          ends_at: Timestamp;
          archived_at?: Timestamp | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["seasons"]["Insert"]>;
        Relationships: [];
      };
      teams: {
        Row: {
          id: RowId;
          organization_id: RowId;
          season_id: RowId;
          division: string;
          name: string;
          coach_user_id: RowId | null;
          mascot: string;
          primary_color: string;
          secondary_color: string;
          theme_key: "soccer" | "football" | "baseball" | "scouts" | "golf" | "tennis" | "swim" | "generic";
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: RowId;
          organization_id: RowId;
          season_id: RowId;
          division: string;
          name: string;
          coach_user_id?: RowId | null;
          mascot?: string;
          primary_color?: string;
          secondary_color?: string;
          theme_key?: "soccer" | "football" | "baseball" | "scouts" | "golf" | "tennis" | "swim" | "generic";
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["teams"]["Insert"]>;
        Relationships: [];
      };
      team_memberships: {
        Row: {
          id: RowId;
          team_id: RowId;
          user_id: RowId;
          role: "coach" | "parent";
          status: "active" | "invited" | "removed";
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: RowId;
          team_id: RowId;
          user_id: RowId;
          role: "coach" | "parent";
          status?: "active" | "invited" | "removed";
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["team_memberships"]["Insert"]>;
        Relationships: [];
      };
      players: {
        Row: {
          id: RowId;
          organization_id: RowId;
          season_id: RowId;
          team_id: RowId;
          first_name: string;
          last_initial: string;
          jersey: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: RowId;
          organization_id: RowId;
          season_id: RowId;
          team_id: RowId;
          first_name: string;
          last_initial: string;
          jersey?: string | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["players"]["Insert"]>;
        Relationships: [];
      };
      parent_invites: {
        Row: {
          id: RowId;
          organization_id: RowId;
          team_id: RowId;
          player_id: RowId;
          email: string;
          phone: string | null;
          invite_token_hash: string;
          status: "pending" | "accepted" | "expired" | "revoked";
          delivery_status: "queued" | "sent" | "failed";
          sent_count: number;
          resend_timestamps: Timestamp[];
          last_sent_at: Timestamp | null;
          expires_at: Timestamp;
          accepted_at: Timestamp | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: RowId;
          organization_id: RowId;
          team_id: RowId;
          player_id: RowId;
          email: string;
          phone?: string | null;
          invite_token_hash: string;
          status: "pending" | "accepted" | "expired" | "revoked";
          delivery_status?: "queued" | "sent" | "failed";
          sent_count?: number;
          resend_timestamps?: Timestamp[];
          last_sent_at?: Timestamp | null;
          expires_at: Timestamp;
          accepted_at?: Timestamp | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["parent_invites"]["Insert"]>;
        Relationships: [];
      };
      player_guardians: {
        Row: {
          id: RowId;
          player_id: RowId;
          parent_user_id: RowId | null;
          parent_invite_id: RowId | null;
          relationship: "mother" | "father" | "guardian" | "other";
          status: "invited" | "active" | "removed";
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: RowId;
          player_id: RowId;
          parent_user_id?: RowId | null;
          parent_invite_id?: RowId | null;
          relationship: "mother" | "father" | "guardian" | "other";
          status: "invited" | "active" | "removed";
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["player_guardians"]["Insert"]>;
        Relationships: [];
      };
      events: {
        Row: {
          id: RowId;
          organization_id: RowId;
          team_id: RowId;
          season_id: RowId;
          title: string;
          event_type: "game" | "practice" | "team_event";
          starts_at: Timestamp;
          ends_at: Timestamp;
          location_name: string | null;
          location_address: string | null;
          latitude: number | null;
          longitude: number | null;
          opponent: string | null;
          status: "scheduled" | "cancelled" | "completed";
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: RowId;
          organization_id: RowId;
          team_id: RowId;
          season_id: RowId;
          title: string;
          event_type: "game" | "practice" | "team_event";
          starts_at: Timestamp;
          ends_at: Timestamp;
          location_name?: string | null;
          location_address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          opponent?: string | null;
          status: "scheduled" | "cancelled" | "completed";
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
        Relationships: [];
      };
      rsvps: {
        Row: {
          id: RowId;
          event_id: RowId;
          player_id: RowId;
          parent_user_id: RowId;
          response: "going" | "not_going" | "maybe";
          note: string | null;
          responded_at: Timestamp;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: RowId;
          event_id: RowId;
          player_id: RowId;
          parent_user_id: RowId;
          response: "going" | "not_going" | "maybe";
          note?: string | null;
          responded_at?: Timestamp;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["rsvps"]["Insert"]>;
        Relationships: [];
      };
      media_items: {
        Row: {
          id: RowId;
          organization_id: RowId;
          team_id: RowId;
          title: string;
          media_type: "google_photos" | "youtube";
          url: string;
          created_at: Timestamp;
        };
        Insert: {
          id?: RowId;
          organization_id: RowId;
          team_id: RowId;
          title: string;
          media_type: "google_photos" | "youtube";
          url: string;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["media_items"]["Insert"]>;
        Relationships: [];
      };
      registration_requests: {
        Row: {
          id: RowId;
          organization_id: RowId;
          season_id: RowId;
          team_id: RowId;
          parent_name: string;
          parent_email: string;
          player_first_name: string;
          player_last_initial: string;
          status: "pending" | "approved" | "rejected";
          reviewed_at: Timestamp | null;
          reviewed_by_user_id: RowId | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: RowId;
          organization_id: RowId;
          season_id: RowId;
          team_id: RowId;
          parent_name: string;
          parent_email: string;
          player_first_name: string;
          player_last_initial: string;
          status?: "pending" | "approved" | "rejected";
          reviewed_at?: Timestamp | null;
          reviewed_by_user_id?: RowId | null;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["registration_requests"]["Insert"]>;
        Relationships: [];
      };
      registration_approval_actions: {
        Row: {
          id: RowId;
          registration_request_id: RowId;
          organization_id: RowId;
          team_id: RowId;
          reviewed_by_user_id: RowId;
          action: "approved" | "rejected" | "matched_existing_player" | "created_player" | "created_guardian" | "created_membership" | "invite_queued";
          result_json: Json;
          note: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: RowId;
          registration_request_id: RowId;
          organization_id: RowId;
          team_id: RowId;
          reviewed_by_user_id: RowId;
          action: "approved" | "rejected" | "matched_existing_player" | "created_player" | "created_guardian" | "created_membership" | "invite_queued";
          result_json?: Json;
          note?: string | null;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["registration_approval_actions"]["Insert"]>;
        Relationships: [];
      };
      parent_replays: {
        Row: {
          id: RowId;
          organization_id: RowId;
          season_id: RowId;
          team_id: RowId;
          coach_user_id: RowId;
          focus_areas: string[];
          title: string;
          summary: string;
          home_activities: Json;
          coach_video: Json;
          parent_tip: string;
          team_quest: string;
          skill_cards: string[];
          parent_education: string;
          status: "draft" | "queued";
          generated_at: Timestamp;
          created_at: Timestamp;
        };
        Insert: {
          id?: RowId;
          organization_id: RowId;
          season_id: RowId;
          team_id: RowId;
          coach_user_id: RowId;
          focus_areas: string[];
          title: string;
          summary: string;
          home_activities: Json;
          coach_video: Json;
          parent_tip: string;
          team_quest: string;
          skill_cards?: string[];
          parent_education: string;
          status?: "draft" | "queued";
          generated_at?: Timestamp;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["parent_replays"]["Insert"]>;
        Relationships: [];
      };
      team_chat_channels: {
        Row: {
          id: RowId;
          organization_id: RowId;
          season_id: RowId;
          team_id: RowId;
          pinned_message_id: RowId | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: RowId;
          organization_id: RowId;
          season_id: RowId;
          team_id: RowId;
          pinned_message_id?: RowId | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["team_chat_channels"]["Insert"]>;
        Relationships: [];
      };
      team_chat_messages: {
        Row: {
          id: RowId;
          organization_id: RowId;
          season_id: RowId;
          team_id: RowId;
          channel_id: RowId;
          event_id: RowId | null;
          author_user_id: RowId;
          author_role: "admin" | "coach" | "parent";
          message_kind: "message" | "announcement";
          announcement_topic: "game_time" | "field_location" | "uniforms" | "snacks" | "weather" | "reminder" | null;
          body: string;
          pinned: boolean;
          moderation_status: "visible" | "hidden" | "deleted";
          read_by_user_ids: RowId[];
          created_at: Timestamp;
          edited_at: Timestamp | null;
          deleted_at: Timestamp | null;
          moderated_at: Timestamp | null;
          moderated_by_user_id: RowId | null;
          moderation_reason: string | null;
        };
        Insert: {
          id?: RowId;
          organization_id: RowId;
          season_id: RowId;
          team_id: RowId;
          channel_id: RowId;
          event_id?: RowId | null;
          author_user_id: RowId;
          author_role: "admin" | "coach" | "parent";
          message_kind: "message" | "announcement";
          announcement_topic?: "game_time" | "field_location" | "uniforms" | "snacks" | "weather" | "reminder" | null;
          body: string;
          pinned?: boolean;
          moderation_status?: "visible" | "hidden" | "deleted";
          read_by_user_ids?: RowId[];
          created_at?: Timestamp;
          edited_at?: Timestamp | null;
          deleted_at?: Timestamp | null;
          moderated_at?: Timestamp | null;
          moderated_by_user_id?: RowId | null;
          moderation_reason?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["team_chat_messages"]["Insert"]>;
        Relationships: [];
      };
      chat_moderation_audit_events: {
        Row: {
          id: RowId;
          message_id: RowId;
          channel_id: RowId;
          team_id: RowId;
          actor_user_id: RowId;
          actor_role: "admin" | "coach" | "parent";
          action: "message_hidden" | "message_deleted" | "message_restored";
          reason: string;
          created_at: Timestamp;
        };
        Insert: {
          id?: RowId;
          message_id: RowId;
          channel_id: RowId;
          team_id: RowId;
          actor_user_id: RowId;
          actor_role: "admin" | "coach" | "parent";
          action: "message_hidden" | "message_deleted" | "message_restored";
          reason: string;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["chat_moderation_audit_events"]["Insert"]>;
        Relationships: [];
      };
      team_chat_message_reads: {
        Row: {
          id: RowId;
          message_id: RowId;
          user_id: RowId;
          read_at: Timestamp;
        };
        Insert: {
          id?: RowId;
          message_id: RowId;
          user_id: RowId;
          read_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["team_chat_message_reads"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: RowId;
          organization_id: RowId;
          recipient_user_id: RowId;
          team_id: RowId;
          event_id: RowId | null;
          notification_type: "schedule_changed" | "event_cancelled" | "new_event" | "invite_sent" | "invite_recovered" | "parent_replay_ready";
          title: string;
          body: string;
          channel: "push" | "email" | "sms";
          status: "pending" | "sent" | "failed" | "read";
          created_at: Timestamp;
          sent_at: Timestamp | null;
          read_at: Timestamp | null;
        };
        Insert: {
          id?: RowId;
          organization_id: RowId;
          recipient_user_id: RowId;
          team_id: RowId;
          event_id?: RowId | null;
          notification_type: "schedule_changed" | "event_cancelled" | "new_event" | "invite_sent" | "invite_recovered" | "parent_replay_ready";
          title: string;
          body: string;
          channel: "push" | "email" | "sms";
          status?: "pending" | "sent" | "failed" | "read";
          created_at?: Timestamp;
          sent_at?: Timestamp | null;
          read_at?: Timestamp | null;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      audit_events: {
        Row: {
          id: RowId;
          organization_id: RowId | null;
          actor_user_id: RowId | null;
          action: string;
          target_type: string;
          target_id: string;
          summary: string;
          created_at: Timestamp;
        };
        Insert: {
          id?: RowId;
          organization_id?: RowId | null;
          actor_user_id?: RowId | null;
          action: string;
          target_type: string;
          target_id: string;
          summary: string;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["audit_events"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      approve_registration_request: {
        Args: {
          target_registration_request_id: RowId;
          reviewer_user_id: RowId;
          review_note?: string | null;
        };
        Returns: Json;
      };
      current_user_can_read_profile: { Args: { target_user_id: RowId }; Returns: boolean };
      current_user_can_access_team: { Args: { target_team_id: RowId }; Returns: boolean };
      current_user_can_manage_team: { Args: { target_team_id: RowId }; Returns: boolean };
      current_user_is_org_admin: { Args: { target_organization_id: RowId }; Returns: boolean };
      reject_registration_request: {
        Args: {
          target_registration_request_id: RowId;
          reviewer_user_id: RowId;
          rejection_note: string;
        };
        Returns: Json;
      };
      reviewer_can_manage_registration: {
        Args: {
          target_registration_request_id: RowId;
          reviewer_user_id: RowId;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
