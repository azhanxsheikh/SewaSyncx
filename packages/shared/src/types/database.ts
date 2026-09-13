export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      disputes: {
        Row: {
          assigned_admin_id: string | null
          created_at: string
          description: string
          id: string
          initiator_id: string
          initiator_role: Database["public"]["Enums"]["user_role"]
          liability_amount: number | null
          liability_party: Database["public"]["Enums"]["liability_party"] | null
          reason_category: Database["public"]["Enums"]["dispute_reason"]
          request_id: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["dispute_status"]
        }
        Insert: {
          assigned_admin_id?: string | null
          created_at?: string
          description: string
          id?: string
          initiator_id: string
          initiator_role: Database["public"]["Enums"]["user_role"]
          liability_amount?: number | null
          liability_party?:
            | Database["public"]["Enums"]["liability_party"]
            | null
          reason_category: Database["public"]["Enums"]["dispute_reason"]
          request_id: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
        }
        Update: {
          assigned_admin_id?: string | null
          created_at?: string
          description?: string
          id?: string
          initiator_id?: string
          initiator_role?: Database["public"]["Enums"]["user_role"]
          liability_amount?: number | null
          liability_party?:
            | Database["public"]["Enums"]["liability_party"]
            | null
          reason_category?: Database["public"]["Enums"]["dispute_reason"]
          request_id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
        }
        Relationships: [
          {
            foreignKeyName: "disputes_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "platform_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_initiator_id_fkey"
            columns: ["initiator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          address_line: string
          area: string
          created_at: string
          emoji: string | null
          id: string
          location: unknown
          name: string
          owner_id: string
          phone: string | null
          relation: string
          updated_at: string
        }
        Insert: {
          address_line: string
          area: string
          created_at?: string
          emoji?: string | null
          id?: string
          location?: unknown
          name: string
          owner_id: string
          phone?: string | null
          relation: string
          updated_at?: string
        }
        Update: {
          address_line?: string
          area?: string
          created_at?: string
          emoji?: string | null
          id?: string
          location?: unknown
          name?: string
          owner_id?: string
          phone?: string | null
          relation?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          commission_rate_applied: number
          id: string
          invoice_number: string
          issued_at: string
          request_id: string
          subtotal: number
          tax: number
          total: number
        }
        Insert: {
          commission_rate_applied: number
          id?: string
          invoice_number: string
          issued_at?: string
          request_id: string
          subtotal: number
          tax: number
          total: number
        }
        Update: {
          commission_rate_applied?: number
          id?: string
          invoice_number?: string
          issued_at?: string
          request_id?: string
          subtotal?: number
          tax?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string | null
          provider_reference: string | null
          request_id: string
          status: Database["public"]["Enums"]["payment_status"]
          upi_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          provider_reference?: string | null
          request_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          upi_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          provider_reference?: string | null
          request_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          upi_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_staff: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          staff_role: Database["public"]["Enums"]["staff_role"]
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name: string
          staff_role?: Database["public"]["Enums"]["staff_role"]
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          staff_role?: Database["public"]["Enums"]["staff_role"]
        }
        Relationships: []
      }
      request_attachments: {
        Row: {
          captured_at: string | null
          created_at: string
          exif_lat: number | null
          exif_lng: number | null
          file_name: string | null
          id: string
          kind: Database["public"]["Enums"]["attachment_kind"]
          phase: Database["public"]["Enums"]["attachment_phase"]
          phash: unknown
          request_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          captured_at?: string | null
          created_at?: string
          exif_lat?: number | null
          exif_lng?: number | null
          file_name?: string | null
          id?: string
          kind: Database["public"]["Enums"]["attachment_kind"]
          phase: Database["public"]["Enums"]["attachment_phase"]
          phash?: unknown
          request_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          captured_at?: string | null
          created_at?: string
          exif_lat?: number | null
          exif_lng?: number | null
          file_name?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["attachment_kind"]
          phase?: Database["public"]["Enums"]["attachment_phase"]
          phash?: unknown
          request_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      request_cost_additions: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          request_id: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["cost_addition_status"]
          tags: string[]
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          request_id: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["cost_addition_status"]
          tags?: string[]
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          request_id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["cost_addition_status"]
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "request_cost_additions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_status_events: {
        Row: {
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["actor_role"]
          id: string
          occurred_at: string
          reason: Database["public"]["Enums"]["status_event_reason"] | null
          request_id: string
          status: Database["public"]["Enums"]["request_status"]
        }
        Insert: {
          actor_id?: string | null
          actor_role: Database["public"]["Enums"]["actor_role"]
          id?: string
          occurred_at?: string
          reason?: Database["public"]["Enums"]["status_event_reason"] | null
          request_id: string
          status: Database["public"]["Enums"]["request_status"]
        }
        Update: {
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["actor_role"]
          id?: string
          occurred_at?: string
          reason?: Database["public"]["Enums"]["status_event_reason"] | null
          request_id?: string
          status?: Database["public"]["Enums"]["request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "request_status_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          accepted_at: string | null
          address_line: string
          address_notes: string | null
          address_text: string | null
          area: string
          category_id: string
          client_id: string
          user_id: string | null
          completed_at: string | null
          contact_name: string
          contact_phone: string
          created_at: string
          description: string | null
          estimated_duration_minutes: number | null
          estimated_total: number
          execution_window: unknown
          family_member_id: string | null
          final_price: number | null
          id: string
          offering_id: string | null
          price_adjustment_notes: string | null
          price_adjustment_reason:
            | Database["public"]["Enums"]["price_adjustment_reason"]
            | null
          priority: Database["public"]["Enums"]["request_priority"] | null
          radius_expanded_at: string | null
          saved_address_id: string | null
          scheduled_at: string | null
          search_radius_km: number
          service_location: unknown
          status: Database["public"]["Enums"]["request_status"]
          superseded_from_request_id: string | null
          surge_multiplier_applied: number
          symptoms: string[]
          technician_id: string | null
          technician_location_at_dispatch: unknown
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          address_line?: string
          address_notes?: string | null
          address_text?: string | null
          area?: string
          category_id: string
          client_id?: string
          user_id?: string | null
          completed_at?: string | null
          contact_name?: string
          contact_phone?: string
          created_at?: string
          description?: string | null
          estimated_duration_minutes?: number | null
          estimated_total?: number
          execution_window?: unknown
          family_member_id?: string | null
          final_price?: number | null
          id?: string
          offering_id?: string | null
          price_adjustment_notes?: string | null
          price_adjustment_reason?:
            | Database["public"]["Enums"]["price_adjustment_reason"]
            | null
          priority?: Database["public"]["Enums"]["request_priority"] | null
          radius_expanded_at?: string | null
          saved_address_id?: string | null
          scheduled_at?: string | null
          search_radius_km?: number
          service_location: unknown
          status?: Database["public"]["Enums"]["request_status"]
          superseded_from_request_id?: string | null
          surge_multiplier_applied?: number
          symptoms?: string[]
          technician_id?: string | null
          technician_location_at_dispatch?: unknown
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          address_line?: string
          address_notes?: string | null
          address_text?: string | null
          area?: string
          category_id?: string
          client_id?: string
          user_id?: string | null
          completed_at?: string | null
          contact_name?: string
          contact_phone?: string
          created_at?: string
          description?: string | null
          estimated_duration_minutes?: number | null
          estimated_total?: number
          execution_window?: unknown
          family_member_id?: string | null
          final_price?: number | null
          id?: string
          offering_id?: string | null
          price_adjustment_notes?: string | null
          price_adjustment_reason?:
            | Database["public"]["Enums"]["price_adjustment_reason"]
            | null
          priority?: Database["public"]["Enums"]["request_priority"] | null
          radius_expanded_at?: string | null
          saved_address_id?: string | null
          scheduled_at?: string | null
          search_radius_km?: number
          service_location?: unknown
          status?: Database["public"]["Enums"]["request_status"]
          superseded_from_request_id?: string | null
          surge_multiplier_applied?: number
          symptoms?: string[]
          technician_id?: string | null
          technician_location_at_dispatch?: unknown
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_offering_id_fkey"
            columns: ["offering_id"]
            isOneToOne: false
            referencedRelation: "service_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_saved_address_id_fkey"
            columns: ["saved_address_id"]
            isOneToOne: false
            referencedRelation: "saved_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_superseded_from_request_id_fkey"
            columns: ["superseded_from_request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          client_id: string
          created_at: string
          id: string
          rating: number
          request_id: string
          review_text: string | null
          tags: string[]
          technician_id: string
          tip_amount: number
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          rating: number
          request_id: string
          review_text?: string | null
          tags?: string[]
          technician_id: string
          tip_amount?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          rating?: number
          request_id?: string
          review_text?: string | null
          tags?: string[]
          technician_id?: string
          tip_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_addresses: {
        Row: {
          address_line: string
          address_line1: string | null
          address_line2: string | null
          area: string
          city: string | null
          created_at: string
          icon: string | null
          id: string
          is_default: boolean
          label: string
          landmark: string | null
          latitude: number | null
          location: unknown
          longitude: number | null
          postal_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line?: string
          address_line1?: string | null
          address_line2?: string | null
          area?: string
          city?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean
          label?: string
          landmark?: string | null
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          postal_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line?: string
          address_line1?: string | null
          address_line2?: string | null
          area?: string
          city?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean
          label?: string
          landmark?: string | null
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          postal_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          default_duration_minutes: number | null
          description: string | null
          icon: string
          id: string
          liability_tier: Database["public"]["Enums"]["liability_tier"]
          name: string
          slug: string
          sos_base_price: number | null
          sos_emergency_fee: number | null
          supports_scheduled: boolean
          supports_sos: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_duration_minutes?: number | null
          description?: string | null
          icon: string
          id?: string
          liability_tier?: Database["public"]["Enums"]["liability_tier"]
          name: string
          slug: string
          sos_base_price?: number | null
          sos_emergency_fee?: number | null
          supports_scheduled?: boolean
          supports_sos?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_duration_minutes?: number | null
          description?: string | null
          icon?: string
          id?: string
          liability_tier?: Database["public"]["Enums"]["liability_tier"]
          name?: string
          slug?: string
          sos_base_price?: number | null
          sos_emergency_fee?: number | null
          supports_scheduled?: boolean
          supports_sos?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      service_offerings: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          duration_max_minutes: number | null
          duration_min_minutes: number | null
          id: string
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          duration_max_minutes?: number | null
          duration_min_minutes?: number | null
          id?: string
          name: string
          price: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          duration_max_minutes?: number | null
          duration_min_minutes?: number | null
          id?: string
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_offerings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_categories: {
        Row: {
          category_id: string
          registered_at: string
          technician_id: string
        }
        Insert: {
          category_id: string
          registered_at?: string
          technician_id: string
        }
        Update: {
          category_id?: string
          registered_at?: string
          technician_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_categories_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technician_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_location_pings: {
        Row: {
          accuracy_meters: number | null
          battery_saver_suspected: boolean
          heading: number | null
          id: number
          location: unknown
          network_type: Database["public"]["Enums"]["network_type"] | null
          recorded_at: string
          request_id: string | null
          speed: number | null
          technician_id: string
        }
        Insert: {
          accuracy_meters?: number | null
          battery_saver_suspected?: boolean
          heading?: number | null
          id?: never
          location: unknown
          network_type?: Database["public"]["Enums"]["network_type"] | null
          recorded_at?: string
          request_id?: string | null
          speed?: number | null
          technician_id: string
        }
        Update: {
          accuracy_meters?: number | null
          battery_saver_suspected?: boolean
          heading?: number | null
          id?: never
          location?: unknown
          network_type?: Database["public"]["Enums"]["network_type"] | null
          recorded_at?: string
          request_id?: string | null
          speed?: number | null
          technician_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_location_pings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_location_pings_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technician_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_locations: {
        Row: {
          heading: number | null
          id: string
          location: unknown
          request_id: string | null
          speed: number | null
          technician_id: string
          updated_at: string
        }
        Insert: {
          heading?: number | null
          id?: string
          location: unknown
          request_id?: string | null
          speed?: number | null
          technician_id: string
          updated_at?: string
        }
        Update: {
          heading?: number | null
          id?: string
          location?: unknown
          request_id?: string | null
          speed?: number | null
          technician_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_locations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_locations_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_profiles: {
        Row: {
          background_checked: boolean
          created_at: string
          experience_years: number | null
          id: string
          identity_verified: boolean
          is_online: boolean
          photo_url: string | null
          rating: number
          review_count: number
          skill_verified: boolean
          total_jobs: number
          updated_at: string
          vehicle_registration: string | null
          vehicle_type: string | null
        }
        Insert: {
          background_checked?: boolean
          created_at?: string
          experience_years?: number | null
          id: string
          identity_verified?: boolean
          is_online?: boolean
          photo_url?: string | null
          rating?: number
          review_count?: number
          skill_verified?: boolean
          total_jobs?: number
          updated_at?: string
          vehicle_registration?: string | null
          vehicle_type?: string | null
        }
        Update: {
          background_checked?: boolean
          created_at?: string
          experience_years?: number | null
          id?: string
          identity_verified?: boolean
          is_online?: boolean
          photo_url?: string | null
          rating?: number
          review_count?: number
          skill_verified?: boolean
          total_jobs?: number
          updated_at?: string
          vehicle_registration?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technician_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          default_location: unknown
          default_street_address: string | null
          default_unit_floor: string | null
          email: string | null
          id: string
          name: string
          phone: string
          preferred_language: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_location?: unknown
          default_street_address?: string | null
          default_unit_floor?: string | null
          email?: string | null
          id: string
          name: string
          phone: string
          preferred_language?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_location?: unknown
          default_street_address?: string | null
          default_unit_floor?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string
          preferred_language?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_request: {
        Args: { p_request_id: string; p_technician_id: string }
        Returns: {
          accepted_at: string | null
          address_line: string
          area: string
          category_id: string
          client_id: string
          completed_at: string | null
          contact_name: string
          contact_phone: string
          created_at: string
          description: string | null
          estimated_duration_minutes: number | null
          estimated_total: number
          execution_window: unknown
          family_member_id: string | null
          final_price: number | null
          id: string
          offering_id: string | null
          price_adjustment_notes: string | null
          price_adjustment_reason:
            | Database["public"]["Enums"]["price_adjustment_reason"]
            | null
          priority: Database["public"]["Enums"]["request_priority"] | null
          radius_expanded_at: string | null
          saved_address_id: string | null
          scheduled_at: string | null
          search_radius_km: number
          service_location: unknown
          status: Database["public"]["Enums"]["request_status"]
          superseded_from_request_id: string | null
          surge_multiplier_applied: number
          symptoms: string[]
          technician_id: string | null
          technician_location_at_dispatch: unknown
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      advance_request_status: {
        Args: {
          p_next_status: Database["public"]["Enums"]["request_status"]
          p_request_id: string
        }
        Returns: {
          accepted_at: string | null
          address_line: string
          area: string
          category_id: string
          client_id: string
          completed_at: string | null
          contact_name: string
          contact_phone: string
          created_at: string
          description: string | null
          estimated_duration_minutes: number | null
          estimated_total: number
          execution_window: unknown
          family_member_id: string | null
          final_price: number | null
          id: string
          offering_id: string | null
          price_adjustment_notes: string | null
          price_adjustment_reason:
            | Database["public"]["Enums"]["price_adjustment_reason"]
            | null
          priority: Database["public"]["Enums"]["request_priority"] | null
          radius_expanded_at: string | null
          saved_address_id: string | null
          scheduled_at: string | null
          search_radius_km: number
          service_location: unknown
          status: Database["public"]["Enums"]["request_status"]
          superseded_from_request_id: string | null
          surge_multiplier_applied: number
          symptoms: string[]
          technician_id: string | null
          technician_location_at_dispatch: unknown
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_profile: {
        Args: { p_name: string; p_phone: string }
        Returns: {
          created_at: string
          default_location: unknown
          default_street_address: string | null
          default_unit_floor: string | null
          email: string | null
          id: string
          name: string
          phone: string
          preferred_language: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "users"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_nearby_matching_technicians: {
        Args: { p_radius_meters: number; p_request_id: string }
        Returns: {
          distance_meters: number
          location_updated_at: string
          rating: number
          review_count: number
          technician_id: string
          total_jobs: number
        }[]
      }
      report_technician_location: {
        Args: {
          p_accuracy_meters?: number
          p_battery_saver_suspected?: boolean
          p_heading?: number
          p_lat: number
          p_lng: number
          p_network_type?: Database["public"]["Enums"]["network_type"]
          p_speed?: number
        }
        Returns: {
          heading: number | null
          id: string
          location: unknown
          request_id: string | null
          speed: number | null
          technician_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "technician_locations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_execution_window: {
        Args: {
          p_accepted_at: string
          p_duration_minutes: number
          p_scheduled_at: string
        }
        Returns: unknown
      }
      request_status_is_terminal: {
        Args: { p_status: Database["public"]["Enums"]["request_status"] }
        Returns: boolean
      }
      request_transition_allowed: {
        Args: {
          p_from: Database["public"]["Enums"]["request_status"]
          p_to: Database["public"]["Enums"]["request_status"]
        }
        Returns: boolean
      }
      settle_job_payment: {
        Args: {
          p_final_price: number
          p_notes?: string
          p_reason?: Database["public"]["Enums"]["price_adjustment_reason"]
          p_request_id: string
        }
        Returns: Json
      }
      register_technician_profile: {
        Args: {
          p_category_ids: string[]
          p_lat?: number | null
          p_lng?: number | null
          p_vehicle_registration?: string | null
          p_vehicle_type?: string | null
        }
        Returns: Database["public"]["Tables"]["technician_profiles"]["Row"]
      }
    }
    Enums: {
      actor_role: "client" | "technician" | "system" | "admin"
      attachment_kind: "image" | "video"
      attachment_phase: "pre_work" | "post_work"
      cost_addition_status: "pending" | "approved" | "declined"
      dispute_reason:
        | "price_dispute"
        | "quality_issue"
        | "no_show"
        | "safety_concern"
        | "harassment"
        | "property_damage"
        | "other"
      dispute_status:
        | "open"
        | "under_review"
        | "awaiting_response"
        | "resolved_client_favor"
        | "resolved_technician_favor"
        | "resolved_split"
        | "dismissed"
      liability_party: "client" | "technician" | "platform" | "split"
      liability_tier: "tier_1" | "tier_2" | "tier_3"
      network_type: "wifi" | "cellular_4g" | "cellular_5g" | "unknown"
      payment_method: "upi" | "card" | "netbanking" | "cash"
      payment_status: "pending" | "processing" | "succeeded" | "failed"
      price_adjustment_reason:
        | "additional_parts"
        | "additional_labor_time"
        | "access_difficulty"
        | "misdiagnosis_correction"
        | "customer_requested_scope_change"
        | "other"
      request_priority: "low" | "medium" | "high"
      request_status:
        | "pending"
        | "accepted"
        | "en_route"
        | "arrived"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "declined"
        | "unfulfilled"
      staff_role: "support_moderator" | "super_admin"
      status_event_reason:
        | "client_initiated"
        | "technician_honest"
        | "technician_ghosted"
        | "system_timeout"
        | "admin_override"
      user_role: "client" | "technician"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      actor_role: ["client", "technician", "system", "admin"],
      attachment_kind: ["image", "video"],
      attachment_phase: ["pre_work", "post_work"],
      cost_addition_status: ["pending", "approved", "declined"],
      dispute_reason: [
        "price_dispute",
        "quality_issue",
        "no_show",
        "safety_concern",
        "harassment",
        "property_damage",
        "other",
      ],
      dispute_status: [
        "open",
        "under_review",
        "awaiting_response",
        "resolved_client_favor",
        "resolved_technician_favor",
        "resolved_split",
        "dismissed",
      ],
      liability_party: ["client", "technician", "platform", "split"],
      liability_tier: ["tier_1", "tier_2", "tier_3"],
      network_type: ["wifi", "cellular_4g", "cellular_5g", "unknown"],
      payment_method: ["upi", "card", "netbanking", "cash"],
      payment_status: ["pending", "processing", "succeeded", "failed"],
      price_adjustment_reason: [
        "additional_parts",
        "additional_labor_time",
        "access_difficulty",
        "misdiagnosis_correction",
        "customer_requested_scope_change",
        "other",
      ],
      request_priority: ["low", "medium", "high"],
      request_status: [
        "pending",
        "accepted",
        "en_route",
        "arrived",
        "in_progress",
        "completed",
        "cancelled",
        "declined",
        "unfulfilled",
      ],
      staff_role: ["support_moderator", "super_admin"],
      status_event_reason: [
        "client_initiated",
        "technician_honest",
        "technician_ghosted",
        "system_timeout",
        "admin_override",
      ],
      user_role: ["client", "technician"],
    },
  },
} as const

