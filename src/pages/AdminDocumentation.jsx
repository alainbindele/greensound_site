import React, { useState, useEffect } from "react";
import { Documentation as DocEntity, User } from "@/api/entities";
import { useLanguage, useTheme } from "@/components/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  FileText,
  Upload,
  Download
} from "lucide-react";
import { UploadFile } from "@/api/integrations";
import { isAdmin } from "@/lib/admin";
import { nullsToEmpty } from "@/lib/forms";
import {
  AdminLoginRequired,
  AdminAccessDenied,
} from "@/components/admin/AdminAuthScreens";
import AdminNav from "@/components/admin/AdminNav";

export default function AdminDocumentation() {
  const { language } = useLanguage();
  const { isDarkMode } = useTheme();
  const [documentation, setDocumentation] = useState([]);
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
    category: "setup",
    order: 0,
    file_url: ""
  });

  const content = {
    it: {
      title: "Gestione Documentazione",
      subtitle: "Aggiungi, modifica o rimuovi documentazione",
      addNew: "Nuova Documentazione",
      edit: "Modifica",
      delete: "Elimina",
      save: "Salva",
      cancel: "Annulla",
      titleIt: "Titolo (IT)",
      titleEn: "Titolo (EN)",
      contentIt: "Contenuto (IT)",
      contentEn: "Contenuto (EN)",
      category: "Categoria",
      order: "Ordine",
      file: "File Allegato",
      uploadFile: "Carica File",
      removeFile: "Rimuovi File",
      noDocs: "Nessuna documentazione trovata",
      categories: {
        setup: "Installazione",
        hardware: "Hardware",
        software: "Software", 
        api: "API",
        examples: "Esempi",
        research: "Ricerca"
      },
      accessDenied: "Accesso Negato",
      accessDeniedMessage: "Non hai i permessi per accedere a questa sezione.",
      loginRequired: "Devi effettuare il login per accedere a questa sezione.",
      login: "Login"
    },
    en: {
      title: "Documentation Management",
      subtitle: "Add, edit or remove documentation",
      addNew: "New Documentation",
      edit: "Edit",
      delete: "Delete",
      save: "Save",
      cancel: "Cancel",
      titleIt: "Title (IT)",
      titleEn: "Title (EN)",
      contentIt: "Content (IT)",
      contentEn: "Content (EN)",
      category: "Category",
      order: "Order",
      file: "Attached File",
      uploadFile: "Upload File",
      removeFile: "Remove File",
      noDocs: "No documentation found",
      categories: {
        setup: "Setup",
        hardware: "Hardware",
        software: "Software",
        api: "API", 
        examples: "Examples",
        research: "Research"
      },
      accessDenied: "Access Denied",
      accessDeniedMessage: "You don't have permission to access this section.",
      loginRequired: "You need to login to access this section.",
      login: "Login"
    }
  };

  const currentContent = content[language];

  const loadDocumentation = async () => {
    setLoading(true);
    try {
      const data = await DocEntity.list('order');
      setDocumentation(data);
    } catch (error) {
      console.error('Error loading documentation:', error);
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
          await loadDocumentation();
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
        await DocEntity.update(editingId, formData);
      } else {
        await DocEntity.create(formData);
      }
      resetForm();
      loadDocumentation();
    } catch (error) {
      console.error('Error saving documentation:', error);
    }
  };

  const handleEdit = (doc) => {
    setFormData(nullsToEmpty(doc));
    setEditingId(doc.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Sei sicuro di voler eliminare questa documentazione?')) {
      try {
        await DocEntity.delete(id);
        loadDocumentation();
      } catch (error) {
        console.error('Error deleting documentation:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title_it: "",
      title_en: "",
      content_it: "",
      content_en: "",
      category: "setup",
      order: 0,
      file_url: ""
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await UploadFile({ file });
      setFormData({ ...formData, file_url: result.file_url });
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setUploading(false);
    }
  };


  // Auth checks (same as previous admin pages)
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
                    <label className="block text-sm font-medium mb-2">{currentContent.category}</label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({...formData, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(currentContent.categories).map(([key, value]) => (
                          <SelectItem key={key} value={key}>{value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

                {/* File Upload Section */}
                <div>
                  <label className="block text-sm font-medium mb-2">{currentContent.file}</label>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={uploading}
                          className="cursor-pointer"
                          onClick={() => document.getElementById('file-upload').click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {uploading ? 'Caricando...' : currentContent.uploadFile}
                        </Button>
                      </label>
                      
                      {formData.file_url && (
                        <div className="flex items-center gap-2">
                          <a
                            href={formData.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-emerald-400 hover:text-emerald-300 text-sm"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            File allegato
                          </a>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFormData({ ...formData, file_url: "" })}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
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

        {/* Documentation List */}
        {documentation.length === 0 ? (
          <Card className={`glass-morphism border-white/20 ${isDarkMode ? 'bg-black/20' : 'bg-white/20'}`}>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-emerald-400 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">{currentContent.noDocs}</h3>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documentation.map((doc) => (
              <Card key={doc.id} className={`glass-morphism border-white/20 hover:border-emerald-400/50 transition-all duration-300 ${isDarkMode ? 'bg-black/20' : 'bg-white/20'}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold line-clamp-2">
                      {language === 'it' ? doc.title_it : doc.title_en}
                    </h3>
                    <div className="flex gap-1 ml-2">
                      <Badge variant="outline">
                        {currentContent.categories[doc.category]}
                      </Badge>
                      <Badge variant="secondary">
                        #{doc.order}
                      </Badge>
                    </div>
                  </div>

                  <p className={`text-sm mb-4 line-clamp-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {(language === 'it' ? doc.content_it : doc.content_en).substring(0, 150)}...
                  </p>

                  {doc.file_url && (
                    <div className="mb-4">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-emerald-400 hover:text-emerald-300 text-sm"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        File allegato
                      </a>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-400">
                      {new Date(doc.created_date).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(doc)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(doc.id)}
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