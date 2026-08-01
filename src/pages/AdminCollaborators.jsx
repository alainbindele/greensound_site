
import React, { useState, useEffect, useCallback } from "react";
import { Collaborator, User } from "@/api/entities";
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
  User as UserIcon, // Renamed to avoid conflict with imported User entity
  Globe, 
  Instagram, 
  Linkedin, 
  Twitter,
  Upload // Added
} from "lucide-react";
import { UploadFile } from "@/api/integrations";
import { isAdmin } from "@/lib/admin";
import { nullsToEmpty } from "@/lib/forms";
import {
  AdminLoginRequired,
  AdminAccessDenied,
} from "@/components/admin/AdminAuthScreens";
import AdminNav from "@/components/admin/AdminNav";

export default function AdminCollaborators() {
  const { language, t } = useLanguage();
  const { isDarkMode } = useTheme();
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true); // This loading state will now be for collaborator data, not auth
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // Added
  const [authLoading, setAuthLoading] = useState(true); // Added
  
  const [formData, setFormData] = useState({
    name: "",
    role_it: "",
    role_en: "",
    description_it: "",
    description_en: "",
    image_url: "",
    website: "",
    instagram: "",
    linkedin: "",
    twitter: "",
    order: 0,
    is_active: true
  });

  const content = {
    it: {
      title: "Gestione Collaboratori",
      subtitle: "Aggiungi, modifica o rimuovi i membri del team",
      addNew: "Nuovo Collaboratore",
      edit: "Modifica",
      delete: "Elimina",
      save: "Salva",
      cancel: "Annulla",
      name: "Nome",
      roleIt: "Ruolo (IT)",
      roleEn: "Ruolo (EN)",
      descriptionIt: "Descrizione (IT)",
      descriptionEn: "Descrizione (EN)",
      image: "Immagine",
      website: "Sito Web",
      socialLinks: "Link Social",
      order: "Ordine",
      active: "Attivo",
      uploadImage: "Carica Immagine",
      imageUrlPlaceholder: "Oppure incolla un URL immagine qui",
      noCollaborators: "Nessun collaboratore trovato",
      accessDenied: "Accesso Negato", // Added
      accessDeniedMessage: "Non hai i permessi per accedere a questa sezione.", // Added
      loginRequired: "Devi effettuare il login per accedere a questa sezione.", // Added
      login: "Login" // Added
    },
    en: {
      title: "Collaborators Management",
      subtitle: "Add, edit or remove team members",
      addNew: "New Collaborator",
      edit: "Edit", 
      delete: "Delete",
      save: "Save",
      cancel: "Cancel",
      name: "Name",
      roleIt: "Role (IT)",
      roleEn: "Role (EN)",
      descriptionIt: "Description (IT)",
      descriptionEn: "Description (EN)",
      image: "Image",
      website: "Website",
      socialLinks: "Social Links",
      order: "Order",
      active: "Active",
      uploadImage: "Upload Image", 
      imageUrlPlaceholder: "Or paste an image URL here",
      noCollaborators: "No collaborators found",
      accessDenied: "Access Denied", // Added
      accessDeniedMessage: "You don't have permission to access this section.", // Added
      loginRequired: "You need to login to access this section.", // Added
      login: "Login" // Added
    }
  };

  const currentContent = content[language];

  // loadCollaborators is defined here, outside useEffect, so it can be a dependency
  // and satisfy the exhaustive-deps rule. State setters (setLoading, setCollaborators)
  // are guaranteed stable by React, so loadCollaborators itself is stable.
  const loadCollaborators = useCallback(async () => {
    setLoading(true); // Start loading collaborator data
    try {
      const data = await Collaborator.list('order');
      setCollaborators(data);
    } catch (error) {
      console.error('Error loading collaborators:', error);
    } finally {
      setLoading(false); // Collaborator data loading is complete
    }
  }, []);

  useEffect(() => {
    // checkAuth is moved inside useEffect to handle its dependencies locally,
    // and loadCollaborators is added to the dependency array of useEffect.
    const checkAuth = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
        // Only load collaborators if the specific user is authenticated
        if (isAdmin(user)) {
          await loadCollaborators(); // loadCollaborators handles its own loading state
        } else {
          setLoading(false); // If not authorized, stop general loading
        }
      } catch (error) {
        console.log('User not authenticated:', error);
        setCurrentUser(null);
        setLoading(false); // If not logged in, stop general loading
      } finally {
        setAuthLoading(false); // Authentication check is complete
      }
    };

    checkAuth();
  }, [loadCollaborators]); // Added loadCollaborators to the dependency array

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await Collaborator.update(editingId, formData);
      } else {
        await Collaborator.create(formData);
      }
      resetForm();
      loadCollaborators();
    } catch (error) {
      console.error('Error saving collaborator:', error);
    }
  };

  const handleEdit = (collaborator) => {
    setFormData(nullsToEmpty(collaborator));
    setEditingId(collaborator.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Sei sicuro di voler eliminare questo collaboratore?')) {
      try {
        await Collaborator.delete(id);
        loadCollaborators();
      } catch (error) {
        console.error('Error deleting collaborator:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      role_it: "",
      role_en: "",
      description_it: "",
      description_en: "",
      image_url: "",
      website: "",
      instagram: "",
      linkedin: "",
      twitter: "",
      order: 0,
      is_active: true
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
      setFormData({ ...formData, image_url: result.file_url });
    } catch (error) {
      console.error('Error uploading image:', error);
      // Let the user know there was an error
      alert('Error uploading image. Please try again or paste a URL manually.');
    } finally {
      setUploading(false);
    }
  };


  // Render logic for authentication and authorization
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

  // Check if user is not logged in
  if (!currentUser) {
    return (
      <AdminLoginRequired
        message={currentContent.loginRequired}
        buttonLabel={currentContent.login}
        language={language}
        />
    );
  }

  // Check if user is not authorized
  if (!isAdmin(currentUser)) {
    return (
      <AdminAccessDenied
        title={currentContent.accessDenied}
        message={currentContent.accessDeniedMessage}
        email={currentUser.email}
      />
    );
  }

  // If loading collaborator data (after auth check passed)
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

  // Main component UI for authorized user
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
                    <label className="block text-sm font-medium mb-2">{currentContent.name}</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{currentContent.order}</label>
                    <Input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({...formData, order: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">{currentContent.roleIt}</label>
                    <Input
                      value={formData.role_it}
                      onChange={(e) => setFormData({...formData, role_it: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{currentContent.roleEn}</label>
                    <Input
                      value={formData.role_en}
                      onChange={(e) => setFormData({...formData, role_en: e.target.value})}
                      required
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
                  <label className="block text-sm font-medium mb-2">{currentContent.image}</label>
                  <div className="flex gap-4 items-center mb-2">
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
                    {formData.image_url && (
                      <img src={formData.image_url} alt="Preview" className="w-16 h-16 rounded-full object-cover" />
                    )}
                  </div>
                  <Input
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder={currentContent.imageUrlPlaceholder}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">{currentContent.website}</label>
                    <Input
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      placeholder="example.com"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium">{currentContent.active}</label>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-emerald-400">{currentContent.socialLinks}</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Instagram</label>
                      <Input
                        value={formData.instagram}
                        onChange={(e) => setFormData({...formData, instagram: e.target.value})}
                        placeholder="https://instagram.com/username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">LinkedIn</label>
                      <Input
                        value={formData.linkedin}
                        onChange={(e) => setFormData({...formData, linkedin: e.target.value})}
                        placeholder="https://linkedin.com/in/username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Twitter</label>
                      <Input
                        value={formData.twitter}
                        onChange={(e) => setFormData({...formData, twitter: e.target.value})}
                        placeholder="https://twitter.com/username"
                      />
                    </div>
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

        {/* Collaborators List */}
        {collaborators.length === 0 ? (
          <Card className={`glass-morphism border-white/20 ${isDarkMode ? 'bg-black/20' : 'bg-white/20'}`}>
            <CardContent className="p-12 text-center">
              <UserIcon className="w-16 h-16 mx-auto mb-4 text-emerald-400 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">{currentContent.noCollaborators}</h3>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collaborators.map((collaborator) => (
              <Card key={collaborator.id} className={`glass-morphism border-white/20 hover:border-emerald-400/50 transition-all duration-300 ${isDarkMode ? 'bg-black/20' : 'bg-white/20'}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      {collaborator.image_url ? (
                        <img
                          src={collaborator.image_url}
                          alt={collaborator.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 flex items-center justify-center">
                          <UserIcon className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold">{collaborator.name}</h3>
                        <p className="text-sm text-emerald-400">
                          {language === 'it' ? collaborator.role_it : collaborator.role_en}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {!collaborator.is_active && (
                        <Badge variant="secondary">Inattivo</Badge>
                      )}
                      <Badge variant="outline">{collaborator.order}</Badge>
                    </div>
                  </div>

                  <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {language === 'it' ? collaborator.description_it : collaborator.description_en}
                  </p>

                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      {collaborator.website && (
                        <Globe className="w-4 h-4 text-emerald-400" />
                      )}
                      {collaborator.instagram && (
                        <Instagram className="w-4 h-4 text-emerald-400" />
                      )}
                      {collaborator.linkedin && (
                        <Linkedin className="w-4 h-4 text-emerald-400" />
                      )}
                      {collaborator.twitter && (
                        <Twitter className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(collaborator)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(collaborator.id)}
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
