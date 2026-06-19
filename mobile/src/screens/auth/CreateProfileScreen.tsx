import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updateMe } from '../../services/usersService';
import { useAuth } from '../../context/AuthContext';

const GRAD_YEARS = ['2024', '2025', '2026', '2027', '2028'];

interface FormState {
  fullName: string;
  college: string;
  major: string;
  gradYear: string;
  bio: string;
  skills: string[];
}

interface FormErrors {
  fullName?: string;
  college?: string;
  major?: string;
}

export default function CreateProfileScreen() {
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState<FormState>({
    fullName: user?.full_name || '',
    college: user?.college || '',
    major: user?.major || '',
    gradYear: user?.grad_year ? String(user.grad_year) : '',
    bio: user?.bio || '',
    skills: [],
  });

  const [currentSkill, setCurrentSkill] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [yearOpen, setYearOpen] = useState(false);

  // Autocomplete state
  const [collegeSuggestions, setCollegeSuggestions] = useState<string[]>([]);
  const [isFetchingColleges, setIsFetchingColleges] = useState(false);
  const [showColleges, setShowColleges] = useState(false);

  // Branch autocomplete state
  const [allBranches, setAllBranches] = useState<string[]>([]);
  const [branchSuggestions, setBranchSuggestions] = useState<string[]>([]);
  const [showBranches, setShowBranches] = useState(false);

  // Skill autocomplete state
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([]);
  const [isFetchingSkills, setIsFetchingSkills] = useState(false);
  const [showSkills, setShowSkills] = useState(false);

  // Parse existing skills from bio if they exist (format: "Skills: A, B")
  useEffect(() => {
    if (user?.bio && user.bio.includes('Skills:')) {
      const parts = user.bio.split('Skills:');
      const textBio = parts[0].trim();
      const skillsStr = parts[1].trim();
      const parsedSkills = skillsStr.split(',').map((s) => s.trim()).filter(Boolean);
      
      setForm((prev) => ({
        ...prev,
        bio: textBio,
        skills: parsedSkills,
      }));
    }
  }, [user]);

  // Fetch college suggestions
  useEffect(() => {
    if (!form.college.trim()) {
      setCollegeSuggestions([]);
      setShowColleges(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsFetchingColleges(true);
      try {
        const res = await fetch(`http://universities.hipolabs.com/search?name=${encodeURIComponent(form.college)}`);
        if (res.ok) {
          const data = await res.json();
          const names = Array.from(new Set(data.map((item: any) => item.name))) as string[];
          setCollegeSuggestions(names.slice(0, 5));
          setShowColleges(names.length > 0);
        }
      } catch (e) {
        console.log('Error fetching colleges', e);
      } finally {
        setIsFetchingColleges(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [form.college]);

  // Fetch branches once on mount
  useEffect(() => {
    fetch('https://gist.githubusercontent.com/avarun42/389566b40eb6b83e591435001a7a64e3/raw')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAllBranches(data);
        }
      })
      .catch(err => console.log('Error fetching branches', err));
  }, []);

  // Filter branches locally
  useEffect(() => {
    if (!form.major.trim()) {
      setBranchSuggestions([]);
      setShowBranches(false);
      return;
    }
    const query = form.major.toLowerCase();
    const matches = allBranches.filter(b => b.toLowerCase().includes(query));
    setBranchSuggestions(matches.slice(0, 5));
    setShowBranches(matches.length > 0);
  }, [form.major, allBranches]);

  // Fetch skills suggestions from Datamuse
  useEffect(() => {
    if (!currentSkill.trim()) {
      setSkillSuggestions([]);
      setShowSkills(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsFetchingSkills(true);
      try {
        const res = await fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(currentSkill)}`);
        if (res.ok) {
          const data = await res.json();
          const words = data.map((item: any) => item.word);
          const newWords = words.filter((w: string) => !form.skills.includes(w));
          setSkillSuggestions(newWords.slice(0, 5));
          setShowSkills(newWords.length > 0);
        }
      } catch (e) {
        console.log('Error fetching skills', e);
      } finally {
        setIsFetchingSkills(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [currentSkill, form.skills]);

  const updateField = (key: keyof FormState, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setApiError(null);
  };

  const addSkill = () => {
    if (currentSkill.trim() && !form.skills.includes(currentSkill.trim())) {
      updateField('skills', [...form.skills, currentSkill.trim()]);
      setCurrentSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    updateField('skills', form.skills.filter((s) => s !== skillToRemove));
  };

  const handleCompleteProfile = async () => {
    // Validation
    const errs: FormErrors = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required';
    if (!form.college.trim()) errs.college = 'College is required';
    if (!form.major.trim()) errs.major = 'Branch is required';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setApiError(null);
    setLoading(true);

    try {
      let finalBio = form.bio.trim();
      if (form.skills.length > 0) {
        const skillsStr = form.skills.join(', ');
        finalBio = finalBio ? `${finalBio}\n\nSkills: ${skillsStr}` : `Skills: ${skillsStr}`;
      }

      const updatedUser = await updateMe({
        full_name: form.fullName.trim(),
        college: form.college.trim(),
        major: form.major.trim(),
        grad_year: form.gradYear ? parseInt(form.gradYear, 10) : undefined,
        bio: finalBio || undefined,
      });

      // Optimistic update in AuthContext, which will re-trigger RootNavigator
      updateUser(updatedUser);
    } catch (err: any) {
      setApiError(err?.response?.data?.message ?? err?.message ?? 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0F1E" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarWrapper}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>
                {form.fullName ? form.fullName.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.cameraBtn} activeOpacity={0.8}>
            <Ionicons name="camera" size={14} color="#FFF" />
          </TouchableOpacity>
        </View>

        {apiError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠ {apiError}</Text>
          </View>
        )}

        <View style={styles.formContainer}>
          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.fullName && styles.inputError]}
              placeholder="e.g. Alex Roy"
              placeholderTextColor="#44445A"
              value={form.fullName}
              onChangeText={(v) => updateField('fullName', v)}
              editable={!loading}
            />
            {errors.fullName && <Text style={styles.fieldError}>{errors.fullName}</Text>}
          </View>

          {/* College */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>College <Text style={styles.required}>*</Text></Text>
            <View>
              <TextInput
                style={[styles.input, errors.college && styles.inputError]}
                placeholder="e.g. Delhi Technological University"
                placeholderTextColor="#44445A"
                value={form.college}
                onChangeText={(v) => {
                  updateField('college', v);
                  if (!v) setShowColleges(false);
                  else setShowColleges(true);
                }}
                editable={!loading}
              />
              {isFetchingColleges && (
                <ActivityIndicator size="small" color="#5B8BFF" style={styles.autocompleteSpinner} />
              )}
            </View>
            
            {showColleges && collegeSuggestions.length > 0 && (
              <View style={styles.autocompleteDropdown}>
                {collegeSuggestions.map((name, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.autocompleteOption}
                    onPress={() => {
                      updateField('college', name);
                      setShowColleges(false);
                    }}
                  >
                    <Text style={styles.autocompleteOptionText} numberOfLines={1}>{name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {errors.college && <Text style={styles.fieldError}>{errors.college}</Text>}
          </View>

          {/* Branch */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Branch <Text style={styles.required}>*</Text></Text>
            <View>
              <TextInput
                style={[styles.input, errors.major && styles.inputError]}
                placeholder="e.g. Computer Science"
                placeholderTextColor="#44445A"
                value={form.major}
                onChangeText={(v) => {
                  updateField('major', v);
                  if (!v) setShowBranches(false);
                  else setShowBranches(true);
                }}
                editable={!loading}
              />
            </View>
            
            {showBranches && branchSuggestions.length > 0 && (
              <View style={styles.autocompleteDropdown}>
                {branchSuggestions.map((name, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.autocompleteOption}
                    onPress={() => {
                      updateField('major', name);
                      setShowBranches(false);
                    }}
                  >
                    <Text style={styles.autocompleteOptionText} numberOfLines={1}>{name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {errors.major && <Text style={styles.fieldError}>{errors.major}</Text>}
          </View>

          {/* Grad Year */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Graduation Year</Text>
            <TouchableOpacity
              style={[styles.input, styles.pickerTrigger]}
              onPress={() => setYearOpen((v) => !v)}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={form.gradYear ? styles.pickerValue : styles.pickerPlaceholder}>
                {form.gradYear || '2026'}
              </Text>
              <Ionicons name={yearOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#8888AA" />
            </TouchableOpacity>
            {yearOpen && (
              <View style={styles.pickerDropdown}>
                {GRAD_YEARS.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[styles.pickerOption, form.gradYear === year && styles.pickerOptionSelected]}
                    onPress={() => { updateField('gradYear', year); setYearOpen(false); }}
                  >
                    <Text style={[styles.pickerOptionText, form.gradYear === year && styles.pickerOptionTextSelected]}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Skills */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Skills</Text>
            <View>
              <TextInput
                style={styles.input}
                placeholder="React Native, Management..."
                placeholderTextColor="#44445A"
                value={currentSkill}
                onChangeText={(v) => {
                  setCurrentSkill(v);
                  if (!v) setShowSkills(false);
                  else setShowSkills(true);
                }}
                onSubmitEditing={addSkill}
                editable={!loading}
              />
              {isFetchingSkills && (
                <ActivityIndicator size="small" color="#5B8BFF" style={styles.autocompleteSpinner} />
              )}
            </View>

            {showSkills && skillSuggestions.length > 0 && (
              <View style={styles.autocompleteDropdown}>
                {skillSuggestions.map((skill, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.autocompleteOption}
                    onPress={() => {
                      if (!form.skills.includes(skill)) {
                        updateField('skills', [...form.skills, skill]);
                      }
                      setCurrentSkill('');
                      setShowSkills(false);
                    }}
                  >
                    <Text style={styles.autocompleteOptionText} numberOfLines={1}>{skill}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {form.skills.length > 0 && (
              <View style={styles.tagsContainer}>
                {form.skills.map((skill) => (
                  <TouchableOpacity key={skill} style={styles.tag} onPress={() => removeSkill(skill)} activeOpacity={0.7}>
                    <Text style={styles.tagText}>{skill}</Text>
                    <Ionicons name="close" size={14} color="#5B8BFF" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Bio */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Passionate about building impactful products and solving real world problems."
              placeholderTextColor="#44445A"
              value={form.bio}
              onChangeText={(v) => updateField('bio', v)}
              multiline
              numberOfLines={3}
              editable={!loading}
            />
          </View>

          {/* Submit */}
          <Pressable style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]} onPress={handleCompleteProfile} disabled={loading}>
            {loading ? (
              <View style={styles.btnInner}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={[styles.primaryBtnText, { marginLeft: 10 }]}>Saving...</Text>
              </View>
            ) : (
              <Text style={styles.primaryBtnText}>Complete Profile</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const INPUT_BG   = '#1A1D2E';
const BORDER     = '#252840';
const ACCENT     = '#5B8BFF';
const ACCENT_DIM = 'rgba(91,139,255,0.35)';
const ERROR_RED  = '#FF6B6B';

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0D0F1E' },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 64, paddingBottom: 48 },
  

  // Avatar
  avatarWrapper: { alignSelf: 'center', marginBottom: 32, position: 'relative' },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: INPUT_BG, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center'
  },
  avatarInitials: { fontSize: 32, color: '#FFFFFF', fontWeight: 'bold' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#252840', width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#0D0F1E'
  },

  formContainer: { flex: 1 },

  errorBanner: { backgroundColor: 'rgba(255, 80, 80, 0.12)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255, 80, 80, 0.3)', padding: 12, marginBottom: 16 },
  errorText: { color: ERROR_RED, fontSize: 13, lineHeight: 18 },
  fieldGroup: { marginBottom: 20 },
  label: { fontSize: 13, color: '#AAAACC', fontWeight: '600', marginBottom: 8 },
  required: { color: ERROR_RED },
  input: { backgroundColor: INPUT_BG, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#FFFFFF' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  inputError: { borderColor: ERROR_RED },
  fieldError: { color: ERROR_RED, fontSize: 12, marginTop: 5 },
  
  pickerTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerPlaceholder: { color: '#44445A', fontSize: 15 },
  pickerValue: { color: '#FFFFFF', fontSize: 15 },
  pickerDropdown: { backgroundColor: '#1A1A30', borderWidth: 1, borderColor: BORDER, borderRadius: 12, marginTop: 4, overflow: 'hidden' },
  pickerOption: { paddingVertical: 13, paddingHorizontal: 16 },
  pickerOptionSelected: { backgroundColor: 'rgba(91, 139, 255, 0.15)' },
  pickerOptionText: { color: '#AAAACC', fontSize: 15 },
  pickerOptionTextSelected: { color: ACCENT, fontWeight: '700' },

  // Autocomplete
  autocompleteSpinner: { position: 'absolute', right: 16, top: 15 },
  autocompleteDropdown: { backgroundColor: '#1A1A30', borderWidth: 1, borderColor: BORDER, borderRadius: 12, marginTop: 4, overflow: 'hidden' },
  autocompleteOption: { paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#252840' },
  autocompleteOptionText: { color: '#AAAACC', fontSize: 15 },

  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 8 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(91, 139, 255, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(91, 139, 255, 0.2)',
  },
  tagText: { color: '#FFFFFF', fontSize: 13 },

  primaryBtn: { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  primaryBtnDisabled: { backgroundColor: ACCENT_DIM, shadowOpacity: 0, elevation: 0 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  btnInner: { flexDirection: 'row', alignItems: 'center' },
});
