async function getName() {
    await new Promise((resolve, reject) => {
        ajaxPost({
            url: `${location.origin}/api/auth/refresh`,
            data: '{}',
            fnSucceed: resolve,
            fnFail: resolve,
        });
    });
    let tmp = document.cookie.split(';').map(data => data.trim().split('=')).filter(data => data[0] === 'n');
    if(tmp.length === 0) return '';
    else return tmp[tmp.length - 1][1];
}