export interface Character {
  id: string
  name: string
  avatar_url?: string | null
  image_base64?: string | null
  system_prompt?: string | null
  greeting?: string | null
  slug?: string | null
  title?: string | null
  tags?: string[]
}
