import React, { useState, useEffect } from "react";
import { Article, User } from "@/api/entities";
import { useLanguage, useTheme } from "@/components/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  FileText,
  Upload,
  Image,
  Tag
} from "lucide-react";
import { UploadFile } from "@/api/integrations";
import { isAdmin } from "@/lib/admin";
import { nullsToEmpty } from "@/lib/forms";
import {
  AdminLoginRequired,
  AdminAccessDenied,
} from "@/components/admin/AdminAuthScreens";
import AdminNav from "@/components/admin/AdminNav";

export default function AdminArticles() {
  const { language } = useLanguage();
  const { isDarkMode } = useTheme();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    title_it: "",
    title_en: "",
    content_it: "",
    content_en: "",
    excerpt_it: "",
    excerpt_en: "",
    images: [],
    tags: [],
    published: false,
    featured: false
  });

  const [tagInput, setTagInput] = useState("");

  const content = {
    it: {
      title: "Gestione Articoli",
      subtitle: "Aggiungi, modifica o rimuovi articoli",
      addNew: "Nuovo Articolo",
      edit: "Modifica",
      delete: "Elimina",
      save: "Salva",
      cancel: "Annulla",
      titleIt: "Titolo (IT)",
      titleEn: "Titolo (EN)",
      contentIt: "Contenuto (IT)",
      contentEn: "Contenuto (EN)",
      excerptIt: "Riassunto (IT)",
      excerptEn: "Riassunto (EN)",
      images: "Immagini",
      tags: "Tag",
      published: "Pubblicato",
      featured: "In Evidenza",
      uploadImage: "Carica Immagine",
      removeImage: "Rimuovi",
      addTag: "Aggiungi Tag",
      noArticles: "Nessun articolo trovato",
      accessDenied: "Accesso Negato",
      accessDeniedMessage: "Non hai i permessi per accedere a questa sezione.",
      loginRequired: "Devi effettuare il login per accedere a questa sezione.",
      login: "Login"
    },
    en: {
      title: "Articles Management",
      subtitle: "Add, edit or remove articles",
      addNew: "New Article",
      edit: "Edit",
      delete: "Delete",
      save: "Save",
      cancel: "Cancel",
      titleIt: "Title (IT)",
      titleEn: "Title (EN)",
      contentIt: "Content (IT)",
      contentEn: "Content (EN)",
      excerptIt: "Excerpt (IT)",
      excerptEn: "Excerpt (EN)",
      images: "Images",
      tags: "Tags",
      published: "Published",
      featured: "Featured",
      uploadImage: "Upload Image",
      removeImage: "Remove",
      addTag: "Add Tag",
      noArticles: "No articles found",
      accessDenied: "Access Denied",
      accessDeniedMessage: "You don't have permission to access this section.",
      loginRequired: "You need to login to access this section.",
      login: "Login"
    }
  };

  const currentContent = content[language];

  const loadArticles = async () => {
    setLoading(true);
    try {
      const data = await Article.list('-created_date');
      setArticles(data);
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
        if (isAdmin(user)) {
          await loadArticles();
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.log('User not authenticated:', error);
        setCurrentUser(null);
        setLoading(false);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await Article.update(editingId, formData);
      } else {
        await Article.create(formData);
      }
      resetForm();
      loadArticles();
    } catch (error) {
      console.error('Error saving article:', error);
    }
  };

  const handleEdit = (article) => {
    setFormData({
      ...nullsToEmpty(article),
      images: article.images || [],
      tags: article.tags || []
    });
    setEditingId(article.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Sei sicuro di voler eliminare questo articolo?')) {
      try {
        await Article.delete(id);
        loadArticles();
      } catch (error) {
        console.error('Error deleting article:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title_it: "",
      title_en: "",
      content_it: "",
      content_en: "",
      excerpt_it: "",
      excerpt_en: "",
      images: [],
      tags: [],
      published: false,
      featured: false
    });
    setTagInput("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await UploadFile({ file });
      setFormData({ 
        ...formData, 
        images: [...(formData.images || []), result.file_url]
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    const newImages = [...formData.images];
    newImages.splice(index, 1);
    setFormData({ ...formData, images: newImages });
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ 
        ...formData, 
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput("");
    }
  };

  const removeTag = (index) => {
    const newTags = [...formData.tags];
    newTags.splice(index, 1);
    setFormData({ ...formData, tags: newTags });
  };


  // Auth checks (same as Events)
  if (authLoading) {
    return (
      <div className="min-h-screen py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AdminLoginRequired
        message={currentContent.loginRequired}
        buttonLabel={currentContent.login}
        language={language}
        />
    );
  }

  if (!isAdmin(currentUser)) {
    return (
      <AdminAccessDenied
        title={currentContent.accessDenied}
        message={currentContent.accessDeniedMessage}
        email={currentUser.email}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdminNav language={language} />

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              {currentContent.title}
            </h1>
            <p className={`text-lg mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {currentContent.subtitle}
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
          >
            <Plus className="w-5 h-5 mr-2" />
            {currentContent.addNew}
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className={`glass-morphism border-white/20 mb-8 ${isDarkMode ? 'bg-black/20' : 'bg-white/20'}`}>
            <CardHeader>
              <CardTitle className="text-emerald-400">
                {editingId ? currentContent.edit : currentContent.addNew}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">{currentContent.titleIt}</label>
                    <Input
                      value={formData.title_it}
                      onChange={(e) => setFormData({...formData, title_it: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{currentContent.titleEn}</label>
                    <Input
                      value={formData.title_en}
                      onChange={(e) => setFormData({...formData, title_en: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">{currentContent.excerptIt}</label>
                    <Textarea
                      value={formData.excerpt_it}
                      onChange={(e) => setFormData({...formData, excerpt_it: e.target.value})}
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{currentContent.excerptEn}</label>
                    <Textarea
                      value={formData.excerpt_en}
                      onChange={(e) => setFormData({...formData, excerpt_en: e.target.value})}
                      rows={3}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">{currentContent.contentIt}</label>
                    <Textarea
                      value={formData.content_it}
                      onChange={(e) => setFormData({...formData, content_it: e.target.value})}
                      rows={6}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{currentContent.contentEn}</label>
                    <Textarea
                      value={formData.content_en}
                      onChange={(e) => setFormData({...formData, content_en: e.target.value})}
                      rows={6}
                      required
                    />
                  </div>
                </div>

                {/* Images Section */}
                <div>
                  <label className="block text-sm font-medium mb-2">{currentContent.images}</label>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={uploading}
                          className="cursor-pointer"
                          onClick={() => document.getElementById('image-upload').click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {uploading ? 'Caricando...' : currentContent.uploadImage}
                        </Button>
                      </label>
                    </div>
                    
                    {formData.images && formData.images.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {formData.images.map((imageUrl, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={imageUrl}
                              alt={`Image ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeImage(index)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags Section */}
                <div>
                  <label className="block text-sm font-medium mb-2">{currentContent.tags}</label>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="Inserisci tag..."
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addTag}
                      >
                        <Tag className="w-4 h-4 mr-2" />
                        {currentContent.addTag}
                      </Button>
                    </div>
                    
                    {formData.tags && formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="border-emerald-400/50 text-emerald-400">
                            {tag}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="ml-2 h-auto p-0 hover:bg-transparent"
                              onClick={() => removeTag(index)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium">{currentContent.published}</label>
                    <Switch
                      checked={formData.published}
                      onCheckedChange={(checked) => setFormData({...formData, published: checked})}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium">{currentContent.featured}</label>
                    <Switch
                      checked={formData.featured}
                      onCheckedChange={(checked) => setFormData({...formData, featured: checked})}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    <X className="w-4 h-4 mr-2" />
                    {currentContent.cancel}
                  </Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                    <Save className="w-4 h-4 mr-2" />
                    {currentContent.save}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Articles List */}
        {articles.length === 0 ? (
          <Card className={`glass-morphism border-white/20 ${isDarkMode ? 'bg-black/20' : 'bg-white/20'}`}>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-emerald-400 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">{currentContent.noArticles}</h3>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <Card key={article.id} className={`glass-morphism border-white/20 hover:border-emerald-400/50 transition-all duration-300 ${isDarkMode ? 'bg-black/20' : 'bg-white/20'}`}>
                <CardContent className="p-6">
                  {article.images && article.images.length > 0 && (
                    <div className="mb-4">
                      <img
                        src={article.images[0]}
                        alt={language === 'it' ? article.title_it : article.title_en}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      {article.images.length > 1 && (
                        <Badge variant="secondary" className="mt-2">
                          <Image className="w-3 h-3 mr-1" />
                          +{article.images.length - 1}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold line-clamp-2">
                      {language === 'it' ? article.title_it : article.title_en}
                    </h3>
                    <div className="flex gap-1 ml-2">
                      {article.featured && (
                        <Badge variant="default">Featured</Badge>
                      )}
                      {!article.published && (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </div>
                  </div>

                  <p className={`text-sm mb-4 line-clamp-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {language === 'it' ? article.excerpt_it : article.excerpt_en}
                  </p>

                  {article.tags && article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {article.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-400">
                      {new Date(article.created_date).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(article)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(article.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}