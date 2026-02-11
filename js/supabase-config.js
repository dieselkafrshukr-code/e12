import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// بيانات مشروع Supabase الخاص بك
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseKey)

// دوال مساعدة للتعامل مع المنتجات
export const supabaseData = {
    // جلب المنتجات
    async getProducts() {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false })
        if (error) throw error
        return data
    },

    // إضافة منتج جديد
    async addProduct(product) {
        const { data, error } = await supabase
            .from('products')
            .insert([product])
            .select()
        if (error) throw error
        return data
    },

    // حذف منتج
    async deleteProduct(id) {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id)
        if (error) throw error
    },

    // تحديث منتج
    async updateProduct(id, updates) {
        const { data, error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', id)
            .select()
        if (error) throw error
        return data
    },

    // إعدادات الشحن
    async getShippingConfig() {
        const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'shipping_config')
            .single()
        if (error) return { price: 0, enabled: false }
        return data.value
    },

    async updateShippingConfig(config) {
        const { error } = await supabase
            .from('settings')
            .upsert({ key: 'shipping_config', value: config, updated_at: new Date() })
        if (error) throw error
    },

    // رفع الصور إلى Supabase Storage
    async uploadImage(file) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${fileName}`

        const { data, error } = await supabase.storage
            .from('products')
            .upload(filePath, file)

        if (error) throw error

        const { data: { publicUrl } } = supabase.storage
            .from('products')
            .getPublicUrl(filePath)

        return publicUrl
    }
}
