function Error({ statusCode }: { statusCode?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', color: '#2E7D32', marginBottom: '16px' }}>{statusCode || 'Hata'}</h1>
        <p style={{ fontSize: '18px', color: '#666' }}>
          {statusCode === 404 ? 'Sayfa bulunamadı' : 'Bir hata oluştu'}
        </p>
        <a href="/dashboard" style={{ display: 'inline-block', marginTop: '24px', padding: '12px 24px', backgroundColor: '#2E7D32', color: '#fff', borderRadius: '8px', textDecoration: 'none' }}>
          Ana Sayfaya Dön
        </a>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: any) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
