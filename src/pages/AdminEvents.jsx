import React, { useState, useEffect } from "react";
import { Event, User } from "@/api/entities";
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
  Calendar,
  Upload,
  Image
} from "lucide-react";
import { UploadFile } from "@/api/integrations";
import { isAdmin } from "@/lib/admin";
import { nullsToEmpty } from "@/lib/forms";
import {
  AdminLoginRequired,
  AdminAccessDenied,
} from "@/components/admin/AdminAuthScreens";
import AdminNav from "@/components/admin/AdminNav";

export default function AdminEvents() {
  const { language } = useLanguage();
  const { isDarkMode } = useTheme();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    title_it: "",
    title_en: "",
    description_it: "",
    description_en: "",
    date: "",
    location: "",
    images: [],
    external_link: "",
    featured: false
  });

  const content = {
    it: {
      title: "Gestione Eventi",
      subtitle: "Aggiungi, modifica o rimuovi eventi",
      addNew: "Nuovo Evento",
      edit: "Modifica",
      delete: "Elimina",
      save: "Salva",
      cancel: "Annulla",
      titleIt: "Titolo (IT)",
      titleEn: "Titolo (EN)",
      descriptionIt: "Descrizione (IT)",
      descriptionEn: "Descrizione (EN)",
      date: "Data e Ora",
      location: "Luogo",
      images: "Immagini",
      externalLink: "Link Esterno",
      featured: "In Evidenza",
      uploadImage: "Carica Immagine",
      removeImage: "Rimuovi",
      noEvents: "Nessun evento trovato",
      accessDenied: "Accesso Negato",
      accessDeniedMessage: "Non hai i permessi per accedere a questa sezione.",
      loginRequired: "Devi effettuare il login per accedere a questa sezione.",
      login: "Login"
    },
    en: {
      title: "Events Management",
      subtitle: "Add, edit or remove events",
      addNew: "New Event",
      edit: "Edit",
      delete: "Delete",
      save: "Save",
      cancel: "Cancel",
      titleIt: "Title (IT)",
      titleEn: "Title (EN)",
      descriptionIt: "Description (IT)",
      descriptionEn: "Description (EN)",
      date: "Date & Time",
      location: "Location",
      images: "Images",
      externalLink: "External Link",
      featured: "Featured",
      uploadImage: "Upload Image",
      removeImage: "Remove",
      noEvents: "No events found",
      accessDenied: "Access Denied",
      accessDeniedMessage: "You don't have permission to access this section.",
      loginRequired: "You need to login to access this section.",
      login: "Login"
    }
  };

  const currentContent = content[language];

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await Event.list('-date');
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
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
          await loadEvents();
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
        await Event.update(editingId, formData);
      } else {
        await Event.create(formData);
      }
      resetForm();
      loadEvents();
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleEdit = (event) => {
    setFormData({
      ...nullsToEmpty(event),
      images: event.images || []
    });
    setEditingId(event.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Sei sicuro di voler eliminare questo evento?')) {
      try {
        await Event.delete(id);
        loadEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title_it: "",
      title_en: "",
      description_it: "",
      description_en: "",
      date: "",
      location: "",
      images: [],
      external_link: "",
      featured: false
    });
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


  // Auth checks
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
                    <label className="block text-sm font-medium mb-2">{currentContent.date}</label>
                    <Input
                      type="datetime-local"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{currentContent.location}</label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">{currentContent.descriptionIt}</label>
                    <Textarea
                      value={formData.description_it}
                      onChange={(e) => setFormData({...formData, description_it: e.target.value})}
                      rows={4}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{currentContent.descriptionEn}</label>
                    <Textarea
                      value={formData.description_en}
                      onChange={(e) => setFormData({...formData, description_en: e.target.value})}
                      rows={4}
                    />
                  </div>
                </div>

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

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">{currentContent.externalLink}</label>
                    <Input
                      value={formData.external_link}
                      onChange={(e) => setFormData({...formData, external_link: e.target.value})}
                      placeholder="https://..."
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

        {/* Events List */}
        {events.length === 0 ? (
          <Card className={`glass-morphism border-white/20 ${isDarkMode ? 'bg-black/20' : 'bg-white/20'}`}>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-emerald-400 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">{currentContent.noEvents}</h3>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Card key={event.id} className={`glass-morphism border-white/20 hover:border-emerald-400/50 transition-all duration-300 ${isDarkMode ? 'bg-black/20' : 'bg-white/20'}`}>
                <CardContent className="p-6">
                  {event.images && event.images.length > 0 && (
                    <div className="mb-4">
                      <img
                        src={event.images[0]}
                        alt={language === 'it' ? event.title_it : event.title_en}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      {event.images.length > 1 && (
                        <Badge variant="secondary" className="mt-2">
                          <Image className="w-3 h-3 mr-1" />
                          +{event.images.length - 1}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold line-clamp-2">
                      {language === 'it' ? event.title_it : event.title_en}
                    </h3>
                    <div className="flex gap-1 ml-2">
                      {event.featured && (
                        <Badge variant="default">Featured</Badge>
                      )}
                    </div>
                  </div>

                  <p className={`text-sm mb-4 line-clamp-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {language === 'it' ? event.description_it : event.description_en}
                  </p>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-400">
                      {new Date(event.date).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(event)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(event.id)}
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