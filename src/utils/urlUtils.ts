export const generateSlug = (title: string): string => {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

export const getArticleIdFromSlug = async (slug: string): Promise<string | null> => {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('../config/firebase');
    
    try {
        const articlesRef = collection(db, 'articles');
        const q = query(
            articlesRef,
            where('slug', '==', slug)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].id;
        }
        
        return null;
    } catch (error) {
        console.error('Error getting article by slug:', error);
        return null;
    }
};

export const getSlugFromArticleId = async (articleId: string): Promise<string | null> => {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('../config/firebase');
    
    try {
        const articleRef = doc(db, 'articles', articleId);
        const articleSnap = await getDoc(articleRef);
        
        if (articleSnap.exists()) {
            const article = articleSnap.data();
            return article.slug || generateSlug(article.title);
        }
        
        return null;
    } catch (error) {
        console.error('Error getting slug from article ID:', error);
        return null;
    }
}; 