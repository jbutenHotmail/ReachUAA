import type React from "react"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Trophy, BookOpen, DollarSign, Star, Users, Gift } from "lucide-react"
import Card from "../../components/ui/Card"
import Badge from "../../components/ui/Badge"
import { api } from "../../api"
import { formatNumber } from "../../utils/numberUtils"
import { useProgramStore } from "../../stores/programStore"
// import ProgramSelector from "../../components/program/ProgramSelector"

// Define achievement categories - now includes bible studies
const ACHIEVEMENT_CATEGORIES = [
  {
    key: "donations",
    label: "Mayores Donaciones",
    icon: <DollarSign size={24} className="text-green-600" />,
    description: "Top personas por total de donaciones recaudadas",
  },
  {
    key: "books_total",
    label: "Más Libros Vendidos",
    icon: <BookOpen size={24} className="text-blue-600" />,
    description: "Top colportores por cantidad total de libros vendidos",
  },
  {
    key: "books_category",
    label: "Libros por Categoría",
    icon: <Star size={24} className="text-purple-600" />,
    description: "Top colportores por categoría específica de libros",
  },
  {
    key: "bible_studies",
    label: "Estudios Bíblicos",
    icon: <Users size={24} className="text-orange-600" />,
    description: "Top colportores por cantidad de estudios bíblicos creados",
  },
]

// Person type options for donations (removed 'todos' option)
const PERSON_TYPE_OPTIONS = [
  { key: "colporter", label: "Colportores", description: "Solo colportores" },
  { key: "leader", label: "Líderes", description: "Solo líderes" },
]

// Book size options
const BOOK_SIZE_OPTIONS = [
  { key: "todos", label: "Todos los Libros", description: "Grandes y pequeños" },
  { key: "large", label: "Libros Grandes", description: "Solo libros grandes" },
  { key: "small", label: "Libros Pequeños", description: "Solo libros pequeños" },
]

interface Achievement {
  id: string
  name: string
  person_type: string
  category?: string
  size?: string
  size_filter?: string
  person_type_filter?: string
  total_donations?: number
  total_books?: number
  total_category_books?: number
  total_book_value?: number
  total_category_value?: number
  total_bible_studies?: number
  study_types_count?: number
  transaction_count?: number
  achievement_rank: number
}

const GiftAnimation: React.FC<{ onGiftClick: () => void }> = ({ onGiftClick }) => {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    setIsAnimating(true)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div
        className={`cursor-pointer transition-all duration-1000 ${
          isAnimating ? "animate-bounce" : ""
        } hover:scale-110 transform`}
        onClick={onGiftClick}
      >
        <div className="relative">
          <Gift size={120} className="text-red-500 drop-shadow-lg animate-pulse" />
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-ping"></div>
          <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-400 rounded-full animate-ping delay-300"></div>
        </div>
      </div>
      <h3 className="mt-6 text-2xl font-bold text-gray-800 animate-fade-in">¡Haz clic en el regalo! 🎁</h3>
      <p className="mt-2 text-gray-600 text-center max-w-md">Descubre los increíbles logros que te esperan...</p>
    </div>
  )
}

const CountdownAnimation: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [count, setCount] = useState(3)
  const [isExploding, setIsExploding] = useState(false)

  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => setCount(count - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setIsExploding(true)
      const timer = setTimeout(() => {
        onComplete()
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [count, onComplete])

  if (isExploding) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="text-8xl animate-ping">🎉</div>
          <div className="absolute top-0 left-0 text-8xl animate-bounce delay-100">✨</div>
          <div className="absolute top-0 right-0 text-8xl animate-bounce delay-200">🎊</div>
        </div>
        <h3 className="mt-6 text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
          ¡Revelando logros!
        </h3>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative">
        <div
          className={`text-9xl font-bold transition-all duration-300 ${
            count === 3
              ? "text-red-500 scale-110"
              : count === 2
              ? "text-yellow-500 scale-110"
              : "text-green-500 scale-110"
          } animate-pulse`}
        >
          {count}
        </div>
        <div className="absolute inset-0 text-9xl font-bold animate-ping opacity-30">{count}</div>
      </div>
      <h3 className="mt-6 text-2xl font-bold text-gray-800">Preparando los logros...</h3>
    </div>
  )
}

const AchievementsPage: React.FC = () => {
  const { t } = useTranslation()
  const { program } = useProgramStore()
  const [selectedCategory, setSelectedCategory] = useState(ACHIEVEMENT_CATEGORIES[0].key)
  const [selectedBookCategory, setSelectedBookCategory] = useState("")
  const [selectedBookSize, setSelectedBookSize] = useState("todos")
  const [selectedPersonType, setSelectedPersonType] = useState("colporter") // Default to colporter
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [bookCategories, setBookCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [showGift, setShowGift] = useState(true)
  const [showCountdown, setShowCountdown] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [pendingCategory, setPendingCategory] = useState<string | null>(null)
  const [pendingPersonType, setPendingPersonType] = useState<string | null>(null)
  const [pendingBookSize, setPendingBookSize] = useState<string | null>(null)
  const [pendingBookCategory, setPendingBookCategory] = useState<string | null>(null)

  const [animationsEnabled, setAnimationsEnabled] = useState(true)

  // Fetch book categories when needed
  useEffect(() => {
    const fetchBookCategories = async () => {
      try {
        const response = await api.get("/achievements/book-categories")
        console.log("Book Categories:", response)
        setBookCategories(response)

        if (selectedCategory === "books_category" && response.length > 0) {
          setSelectedBookCategory(response[0])
        }
      } catch (error) {
        console.error("Error fetching book categories:", error)
      }
    }

    if (selectedCategory === "books_category") {
      fetchBookCategories()
    }
  }, [selectedCategory])

  // Fetch achievements based on selected category, book category, book size, and person type
  useEffect(() => {
    const fetchAchievements = async () => {
      if (!program?.id) {
        setAchievements([])
        return
      }

      setIsLoading(true)
      try {
        const params: Record<string, string> = {
          category: selectedCategory,
          programId: program.id.toString(),
        }

        if (selectedCategory === "donations") {
          params.person_type = selectedPersonType
        }

        if (selectedCategory === "books_total") {
          if (selectedBookSize && selectedBookSize !== "todos") {
            params.book_size = selectedBookSize
          }
        }

        if (selectedCategory === "books_category") {
          if (selectedBookCategory) {
            params.book_category = selectedBookCategory
          }
        }

        console.log("Fetching achievements with params:", params)
        const response = await api.get("/achievements", { params })
        console.log("Achievements response:", response)
        // Deduplicate achievements by id
        const uniqueAchievements = Array.from(
          new Map(response.map((item: Achievement) => [item.id, item])).values()
        )
        // Log any duplicates found
        const ids = response.map((item: Achievement) => item.id)
        const duplicates = ids.filter((id: string, index: number) => ids.indexOf(id) !== index)
        if (duplicates.length > 0) {
          console.warn("Duplicate achievement IDs found:", duplicates)
        }
        // Log missing or undefined fields
        uniqueAchievements.forEach((achievement: Achievement, index: number) => {
          if (
            selectedCategory === "donations" &&
            (achievement.total_donations === undefined || achievement.transaction_count === undefined)
          ) {
            console.warn(`Achievement ${index} (ID: ${achievement.id}) has undefined fields for donations`, achievement)
          }
          if (
            selectedCategory === "books_total" &&
            (achievement.total_books === undefined || achievement.total_book_value === undefined)
          ) {
            console.warn(`Achievement ${index} (ID: ${achievement.id}) has undefined fields for books_total`, achievement)
          }
          if (
            selectedCategory === "books_category" &&
            (achievement.total_category_books === undefined || achievement.total_category_value === undefined)
          ) {
            console.warn(`Achievement ${index} (ID: ${achievement.id}) has undefined fields for books_category`, achievement)
          }
          if (
            selectedCategory === "bible_studies" &&
            (achievement.total_bible_studies === undefined || achievement.study_types_count === undefined)
          ) {
            console.warn(`Achievement ${index} (ID: ${achievement.id}) has undefined fields for bible_studies`, achievement)
          }
        })
        setAchievements(uniqueAchievements)
      } catch (error) {
        console.error("Error fetching achievements:", error)
        setAchievements([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchAchievements()
  }, [selectedCategory, selectedBookCategory, selectedBookSize, selectedPersonType, program?.id])

  const renderAchievementValue = (achievement: Achievement) => {
    switch (selectedCategory) {
      case "donations":
        return `$${formatNumber(achievement.total_donations ?? 0)} (${
          achievement.transaction_count ?? 0
        } trans.)`
      case "books_total":
        return `${achievement.total_books ?? 0} libros ($${formatNumber(achievement.total_book_value ?? 0)})`
      case "books_category":
        return `${achievement.total_category_books ?? 0} libros ($${formatNumber(
          achievement.total_category_value ?? 0
        )})`
      case "bible_studies":
        return `${achievement.total_bible_studies ?? 0} estudios (${achievement.study_types_count ?? 0} tipos)`
      default:
        return "-"
    }
  }

  const renderAchievementSubtitle = (achievement: Achievement) => {
    switch (selectedCategory) {
      case "donations":
        const typeLabel = achievement.person_type_filter === "colporter" ? "Colportores" : "Líderes"
        const actualType = achievement.person_type === "COLPORTER" ? "Colporter" : "Líder"
        return `Filtro: ${typeLabel} • Tipo: ${actualType}`
      case "books_total":
        if (achievement.size_filter && achievement.size_filter !== "todos") {
          const sizeLabel = achievement.size_filter === "large" ? "Libros Grandes" : "Libros Pequeños"
          return `Filtro: ${sizeLabel}`
        }
        return "Todos los libros"
      case "books_category":
        const categoryParts = []
        if (achievement.category) categoryParts.push(`Categoría: ${achievement.category}`)
        if (achievement.size) categoryParts.push(`Tamaño: ${achievement.size === "LARGE" ? "Grande" : "Pequeño"}`)
        return categoryParts.join(" • ")
      case "bible_studies":
        return `${achievement.study_types_count ?? 0} tipos diferentes de estudios`
      default:
        return ""
    }
  }

  const renderAchievementLabel = (category: string) => {
    switch (category) {
      case "donations":
        const typeLabel = selectedPersonType === "colporter" ? "Colportores" : "Líderes"
        return `Top Donaciones (${typeLabel})`
      case "books_total":
        let label = "Top Libros Vendidos"
        if (selectedBookSize && selectedBookSize !== "todos") {
          const sizeLabel = selectedBookSize === "large" ? "Grandes" : "Pequeños"
          label += ` (${sizeLabel})`
        }
        return label
      case "books_category":
        let categoryLabel = "Top Libros por Categoría"
        if (selectedBookCategory) categoryLabel += ` - ${selectedBookCategory}`
        return categoryLabel
      case "bible_studies":
        return "Top Estudios Bíblicos"
      default:
        return "Logros"
    }
  }

  const getRankBadgeVariant = (rank: number) => {
    switch (rank) {
      case 1:
        return "primary"
      case 2:
        return "secondary"
      case 3:
        return "warning"
      default:
        return "info"
    }
  }

  const getRankStyles = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          badgeClass: "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-bold shadow-lg",
          rowClass: "bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-400",
          medal: "🥇",
        }
      case 2:
        return {
          badgeClass: "bg-gradient-to-r from-gray-300 to-gray-500 text-white font-bold shadow-lg",
          rowClass: "bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400",
          medal: "🥈",
        }
      case 3:
        return {
          badgeClass: "bg-gradient-to-r from-orange-400 to-orange-600 text-white font-bold shadow-lg",
          rowClass: "bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-orange-400",
          medal: "🥉",
        }
      default:
        return {
          badgeClass: "bg-blue-100 text-blue-800",
          rowClass: "hover:bg-gray-50",
          medal: "",
        }
    }
  }

  const handleCategoryClick = (categoryKey: string) => {
    if (categoryKey === selectedCategory) return // Don't animate if same category

    setSelectedCategory(categoryKey)

    if (!animationsEnabled) {
      // Reset other filters when changing category
      if (categoryKey !== "donations") {
        setSelectedPersonType("colporter")
      }
      if (categoryKey !== "books_category") {
        setSelectedBookCategory("")
      }
      if (categoryKey !== "books_total") {
        setSelectedBookSize("todos")
      }
      setShowResults(true)
      setShowGift(false)
      setShowCountdown(false)
      return
    }

    setPendingCategory(categoryKey)
    setShowResults(false)
    setShowGift(true)
    setShowCountdown(false)
  }

  const handlePersonTypeClick = (personType: string) => {
    if (personType === selectedPersonType) return

    if (!animationsEnabled) {
      setSelectedPersonType(personType)
      return
    }

    setPendingPersonType(personType)
    setShowResults(false)
    setShowGift(true)
    setShowCountdown(false)
  }

  const handleBookSizeClick = (bookSize: string) => {
    if (bookSize === selectedBookSize) return

    if (!animationsEnabled) {
      setSelectedBookSize(bookSize)
      return
    }

    setPendingBookSize(bookSize)
    setShowResults(false)
    setShowGift(true)
    setShowCountdown(false)
  }

  const handleBookCategoryClick = (bookCategory: string) => {
    if (bookCategory === selectedBookCategory) return

    if (!animationsEnabled) {
      setSelectedBookCategory(bookCategory)
      return
    }

    setPendingBookCategory(bookCategory)
    setShowResults(false)
    setShowGift(true)
    setShowCountdown(false)
  }

  const handleGiftClick = () => {
    setShowGift(false)
    setShowCountdown(true)
  }

  const handleCountdownComplete = () => {
    setShowCountdown(false)

    if (pendingCategory) {
      if (pendingCategory !== "donations") {
        setSelectedPersonType("colporter")
      }
      if (pendingCategory !== "books_category") {
        setSelectedBookCategory("")
      }
      if (pendingCategory !== "books_total") {
        setSelectedBookSize("todos")
      }
      setPendingCategory(null)
    }

    if (pendingPersonType) {
      setSelectedPersonType(pendingPersonType)
      setPendingPersonType(null)
    }

    if (pendingBookSize) {
      setSelectedBookSize(pendingBookSize)
      setPendingBookSize(null)
    }

    if (pendingBookCategory) {
      setSelectedBookCategory(pendingBookCategory)
      setPendingBookCategory(null)
    }

    setShowResults(true)
  }

  // Show message if no program is selected
  if (!program) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("achievements.title")}</h1>
            <p className="mt-2 text-sm text-gray-500">{t("achievements.description")}</p>
          </div>
          {/* <ProgramSelector /> */}
        </div>

        <Card>
          <div className="text-center py-10">
            <Trophy size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-900">No hay programa seleccionado</p>
            <p className="text-sm text-gray-500 mt-2">Selecciona un programa para ver los logros y estadísticas.</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("achievements.title")}</h1>
          <p className="mt-2 text-sm text-gray-500">{t("achievements.description")}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Animaciones</label>
            <button
              onClick={() => setAnimationsEnabled(!animationsEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                animationsEnabled ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  animationsEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          {/* <ProgramSelector /> */}
        </div>
      </div>

      {/* Category Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {ACHIEVEMENT_CATEGORIES.map((category) => (
          <button
            key={category.key}
            onClick={() => handleCategoryClick(category.key)}
            className={`
              flex flex-col items-center justify-center p-4 rounded-lg transition-all duration-300 hover:shadow-md
              ${
                selectedCategory === category.key
                  ? "bg-primary-100 border-2 border-primary-500 text-primary-700 shadow-md"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-2 border-transparent"
              }
            `}
          >
            {category.icon}
            <span className="mt-2 text-sm font-medium text-center">{category.label}</span>
            <span className="text-xs text-gray-500 text-center mt-1 leading-tight">{category.description}</span>
          </button>
        ))}
      </div>

      {animationsEnabled && showGift && (
        <Card>
          <GiftAnimation onGiftClick={handleGiftClick} />
        </Card>
      )}

      {animationsEnabled && showCountdown && (
        <Card>
          <CountdownAnimation onComplete={handleCountdownComplete} />
        </Card>
      )}

      {(!animationsEnabled || showResults) && (
        <>
          {/* Person Type Selector for donations category */}
          {selectedCategory === "donations" && (
            <Card title="Seleccionar Tipo de Persona">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PERSON_TYPE_OPTIONS.map((typeOption) => (
                  <button
                    key={typeOption.key}
                    onClick={() => handlePersonTypeClick(typeOption.key)}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg transition-all duration-300 hover:shadow-sm
                      ${
                        selectedPersonType === typeOption.key
                          ? "bg-green-100 border-2 border-green-500 text-green-700 shadow-md"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-2 border-transparent"
                      }
                    `}
                  >
                    <span className="text-sm font-medium text-center">{typeOption.label}</span>
                    <span className="text-xs text-gray-500 text-center mt-1">{typeOption.description}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Book Size Selector for books_total category */}
          {selectedCategory === "books_total" && (
            <Card title="Seleccionar Tamaño de Libro">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {BOOK_SIZE_OPTIONS.map((sizeOption) => (
                  <button
                    key={sizeOption.key}
                    onClick={() => handleBookSizeClick(sizeOption.key)}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg transition-all duration-300 hover:shadow-sm
                      ${
                        selectedBookSize === sizeOption.key
                          ? "bg-blue-100 border-2 border-blue-500 text-blue-700 shadow-md"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-2 border-transparent"
                      }
                    `}
                  >
                    <span className="text-sm font-medium text-center">{sizeOption.label}</span>
                    <span className="text-xs text-gray-500 text-center mt-1">{sizeOption.description}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Book Category Selector for books_category */}
          {selectedCategory === "books_category" && (
            <Card title="Seleccionar Categoría de Libro">
              <div className="flex flex-wrap gap-2">
                {bookCategories.length > 0 ? (
                  bookCategories.map((category) => (
                    <button
                      key={category}
                      onClick={() => handleBookCategoryClick(category)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:shadow-sm
                        ${
                          selectedBookCategory === category
                            ? "bg-purple-500 text-white shadow-md"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }
                      `}
                    >
                      {category}
                    </button>
                  ))
                ) : (
                  <div className="text-gray-500 text-sm">Cargando categorías de libros...</div>
                )}
              </div>
            </Card>
          )}

          {/* Achievements Table */}
          <Card title={renderAchievementLabel(selectedCategory)} icon={<Trophy size={20} />}>
            {isLoading ? (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <p className="mt-2 text-gray-600">Cargando logros...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ranking
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rendimiento
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {achievements.length > 0 ? (
                      achievements.map((achievement, index) => {
                        const rankStyles = getRankStyles(achievement.achievement_rank)
                        return (
                          <tr key={achievement.id} className={`transition-colors ${rankStyles.rowClass}`}>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {rankStyles.medal && <span className="text-2xl">{rankStyles.medal}</span>}
                                <Badge className={rankStyles.badgeClass}>#{achievement.achievement_rank}</Badge>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{achievement.name}</div>
                              <div className="text-xs text-gray-500">{renderAchievementSubtitle(achievement)}</div>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="text-sm font-bold text-gray-900">
                                {renderAchievementValue(achievement)}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center">
                          <div className="text-gray-500">
                            <Trophy size={48} className="mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium">No hay logros disponibles</p>
                            <p className="text-sm">
                              {selectedCategory === "books_category" && !selectedBookCategory
                                ? "Selecciona una categoría de libro para ver los logros específicos."
                                : "No se encontraron datos para esta categoría."}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Achievement Summary */}
          {achievements.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card title="Participantes">
                <div className="text-2xl font-bold text-primary-600">{achievements.length}</div>
                <p className="text-sm text-gray-500">
                  {selectedCategory === "donations"
                    ? `${selectedPersonType === "colporter" ? "Colportores" : "Líderes"} con logros`
                    : "Colportores con logros"}
                </p>
              </Card>

              {achievements[0] && (
                <Card title="Mejor Rendimiento">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedCategory === "donations" && `$${formatNumber(achievements[0].total_donations ?? 0)}`}
                    {selectedCategory === "books_total" && `${formatNumber(achievements[0].total_books ?? 0)} libros`}
                    {selectedCategory === "books_category" &&
                      `${formatNumber(achievements[0].total_category_books ?? 0)} libros`}
                    {selectedCategory === "bible_studies" &&
                      `${formatNumber(achievements[0].total_bible_studies ?? 0)} estudios`}
                  </div>
                  <p className="text-sm text-gray-500">Por {achievements[0].name}</p>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AchievementsPage