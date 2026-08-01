import React, { useState, useEffect } from "react";
import { News, User } from "@/api/entities";
import { useLanguage } from "@/components/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Upload,
  AlertCircle,
  ExternalLink,
  Newspaper,
} from "lucide-react";
import { UploadFile } from "@/api/integrations";
import { isAdmin } from "@/lib/admin";
import {
  AdminLoginRequired,
  AdminAccessDenied,
} from "@/components/admin/AdminAuthScreens";
import AdminNav from "@/components/admin/AdminNav";
import { SpotlightCard, EmptyState, SkeletonGrid, Chip } from "@/components/kit";

const EMPTY_FORM = {
  title_it: "",
  title_en: "",
  content_it: "",
  content_en: "",
  images: [],
  external_link: "",
  urgent: false,
};

export default function AdminNews() {
  const { language } = useLanguage();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const content = {
    it: {
      title: "Gestione News",
      subtitle: "Aggiungi, modifica o rimuovi le news",
      addNew: "Nuova News",
      edit: "Modifica",
      delete: "Elimina",
      save: "Salva",
      saving: "Salvataggio…",
      cancel: "Annulla",
      titleIt: "Titolo (IT)",
      titleEn: "Titolo (EN)",
      contentIt: "Contenuto (IT)",
      contentEn: "Contenuto (EN)",
      images: "Immagini",
      uploadImage: "Carica Immagine",
      uploading: "Caricamento…",
      externalLink: "Link esterno",
      urgent: "Urgente",
      noNews: "Nessuna news trovata",
      noNewsHint: "Crea la prima news con il pulsante qui sopra.",
      loading: "Caricamento news",
      confirmDelete: "Sei sicuro di voler eliminare questa news?",
      accessDenied: "Accesso Negato",
      accessDeniedMessage: "Non hai i permessi per accedere a questa sezione.",
      loginRequired: "Devi effettuare il login per accedere a questa sezione.",
      login: "Login",
      saveError: "Salvataggio non riuscito. Riprova.",
      loadError: "Caricamento non riuscito.",
      uploadError: "Caricamento immagine non riuscito. Riprova.",
      deleteError: "Eliminazione non riuscita.",
      removeImage: "Rimuovi immagine",
    },
    en: {
      title: "News Management",
      subtitle: "Add, edit or remove news",
      addNew: "New News",
      edit: "Edit",
      delete: "Delete",
      save: "Save",
      saving: "Saving…",
      cancel: "Cancel",
      titleIt: "Title (IT)",
      titleEn: "Title (EN)",
      contentIt: "Content (IT)",
      contentEn: "Content (EN)",
      images: "Images",
      uploadImage: "Upload Image",
      uploading: "Uploading…",
      externalLink: "External link",
      urgent: "Urgent",
      noNews: "No news found",
      noNewsHint: "Create the first item with the button above.",
      loading: "Loading news",
      confirmDelete: "Are you sure you want to delete this news item?",
      accessDenied: "Access Denied",
      accessDeniedMessage: "You don't have permission to access this section.",
      loginRequired: "You need to login to access this section.",
      login: "Login",
      saveError: "Could not save. Please try again.",
      loadError: "Could not load news.",
      uploadError: "Image upload failed. Please try again.",
      deleteError: "Could not delete.",
      removeImage: "Remove image",
    },
  };

  const currentContent = content[language];

  const loadNews = async () => {
    setLoading(true);
    try {
      const data = await News.list('-created_date');
      setNews(data);
      setError(null);
    } catch (err) {
      console.error('Error loading news:', err);
      setError(currentContent.loadError);
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
          await loadNews();
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.log('User not authenticated:', err);
        setCurrentUser(null);
        setLoading(false);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await News.update(editingId, formData);
      } else {
        await News.create(formData);
      }
      resetForm();
      await loadNews();
    } catch (err) {
      console.error('Error saving news:', err);
      // Surfaced in the form rather than swallowed into the console.
      setError(currentContent.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setFormData({
      ...EMPTY_FORM,
      ...item,
      // Older records carry a single image_url instead of an images array.
      images: item.images || (item.image_url ? [item.image_url] : []),
    });
    setEditingId(item.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm(currentContent.confirmDelete)) return;
    try {
      await News.delete(id);
      await loadNews();
    } catch (err) {
      console.error('Error deleting news:', err);
      setError(currentContent.deleteError);
    }
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await UploadFile({ file });
      setFormData((prev) => ({
        ...prev,
        images: [...(prev.images || []), result.file_url],
      }));
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(currentContent.uploadError);
    } finally {
      setUploading(false);
      // Let the same file be picked again after a failure.
      e.target.value = '';
    }
  };

  const removeImage = (index) => {
    setFormData((prev) => {
      const images = [...prev.images];
      images.splice(index, 1);
      return { ...prev, images };
    });
  };


  if (authLoading) {
    return (
      <div className="shell py-32">
        <SkeletonGrid count={3} media={false} label={currentContent.loading} />
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

  return (
    <div className="min-h-screen pb-24 pt-28 md:pt-32">
      <div className="shell">
        <AdminNav language={language} />

        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-gradient-bio text-3xl font-bold md:text-4xl">
              {currentContent.title}
            </h1>
            <p className="mt-2 text-muted-foreground">{currentContent.subtitle}</p>
          </div>
          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="rounded-full bg-brand-solid text-primary-foreground shadow-glow hover:bg-brand-solid/90"
            >
              <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
              {currentContent.addNew}
            </Button>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="mb-8 flex items-center gap-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive ring-1 ring-inset ring-destructive/30"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <SpotlightCard interactive={false} className="mb-12">
            <form onSubmit={handleSubmit} className="space-y-6 p-8">
              <h2 className="text-xl font-semibold text-brand">
                {editingId ? currentContent.edit : currentContent.addNew}
              </h2>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="news-title-it" className="mb-2 block text-sm font-medium">
                    {currentContent.titleIt}
                  </label>
                  <Input
                    id="news-title-it"
                    value={formData.title_it}
                    onChange={(e) => setFormData({ ...formData, title_it: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="news-title-en" className="mb-2 block text-sm font-medium">
                    {currentContent.titleEn}
                  </label>
                  <Input
                    id="news-title-en"
                    value={formData.title_en}
                    onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="news-content-it" className="mb-2 block text-sm font-medium">
                    {currentContent.contentIt}
                  </label>
                  <Textarea
                    id="news-content-it"
                    value={formData.content_it}
                    onChange={(e) => setFormData({ ...formData, content_it: e.target.value })}
                    rows={8}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="news-content-en" className="mb-2 block text-sm font-medium">
                    {currentContent.contentEn}
                  </label>
                  <Textarea
                    id="news-content-en"
                    value={formData.content_en}
                    onChange={(e) => setFormData({ ...formData, content_en: e.target.value })}
                    rows={8}
                    required
                  />
                </div>
              </div>

              <div>
                <span className="mb-2 block text-sm font-medium">
                  {currentContent.images}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                  id="news-image-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  className="rounded-full border-brand/50 text-brand hover:bg-brand/10 hover:text-brand"
                  onClick={() => document.getElementById('news-image-upload').click()}
                >
                  <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                  {uploading ? currentContent.uploading : currentContent.uploadImage}
                </Button>

                {formData.images && formData.images.length > 0 && (
                  <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                    {formData.images.map((imageUrl, index) => (
                      <li key={imageUrl} className="group relative">
                        <img
                          src={imageUrl}
                          alt=""
                          className="h-24 w-full rounded-lg object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          aria-label={`${currentContent.removeImage} ${index + 1}`}
                          className="absolute right-1 top-1 h-8 w-8 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="news-link" className="mb-2 block text-sm font-medium">
                    {currentContent.externalLink}
                  </label>
                  <Input
                    id="news-link"
                    type="url"
                    value={formData.external_link}
                    onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="flex items-center gap-3 md:pt-8">
                  <Switch
                    id="news-urgent"
                    checked={formData.urgent}
                    onCheckedChange={(checked) => setFormData({ ...formData, urgent: checked })}
                  />
                  <label htmlFor="news-urgent" className="text-sm font-medium">
                    {currentContent.urgent}
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" className="rounded-full" onClick={resetForm}>
                  <X className="mr-2 h-4 w-4" aria-hidden="true" />
                  {currentContent.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-brand-solid text-primary-foreground hover:bg-brand-solid/90"
                >
                  <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                  {saving ? currentContent.saving : currentContent.save}
                </Button>
              </div>
            </form>
          </SpotlightCard>
        )}

        {/* List */}
        {loading ? (
          <SkeletonGrid count={3} media={false} label={currentContent.loading} />
        ) : news.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title={currentContent.noNews}
            description={currentContent.noNewsHint}
          />
        ) : (
          <ul className="space-y-4">
            {news.map((item) => (
              <li key={item.id}>
                <SpotlightCard interactive={false}>
                  <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
                    {item.images?.[0] && (
                      <img
                        src={item.images[0]}
                        alt=""
                        className="h-20 w-full shrink-0 rounded-lg object-cover sm:w-28"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-semibold">
                          {item.title_it || item.title_en}
                        </h3>
                        {item.urgent && (
                          <Chip tone="solar">
                            <AlertCircle className="h-3 w-3" aria-hidden="true" />
                            {currentContent.urgent}
                          </Chip>
                        )}
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {item.content_it || item.content_en}
                      </p>
                      {item.external_link && (
                        <a
                          href={item.external_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1.5 text-xs text-brand hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          {item.external_link}
                        </a>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`${currentContent.edit}: ${item.title_it || item.title_en}`}
                        className="h-10 w-10 rounded-full"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        aria-label={`${currentContent.delete}: ${item.title_it || item.title_en}`}
                        className="h-10 w-10 rounded-full"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </SpotlightCard>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
