async function getName() {
    await new Promise((resolve, reject) => {
        ajaxPost({
            url: `${location.origin}/api/auth/refresh`,
            data: '{}',
            fnSucceed: (data) => {
                resolve(data);
            },
            fnFail: (data) => {
                if(data.status === 401) resolve('');
                else reject(data.text);
            }
        });
    });
}