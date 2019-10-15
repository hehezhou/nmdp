function createAjax() {
    let ans;
    try {
        ans = new XMLHttpRequest();
    }
    catch (e) {
        try {
            ans = new ActiveXObject('Msxml2.XMLHTTP');
        }
        catch (e) {
            try {
                ans = new ActiveXObject('Microsoft.XMLHTTP');
            }
            catch (e) {
                alert('请更新浏览器');
                return false;
            }
        }
    }
    return ans;
}
function ajaxPost({url, data, fnSucceed = () => {}, fnFail = () => {}, fnLoading = () => {}}) {
    let ajax = createAjax();
    if(!ajax) return;
    ajax.open('post', url, true);
    ajax.onreadystatechange = function () {
        if (ajax.readyState == 4) {
            if (ajax.status == 200) {
                fnSucceed(ajax.responseText);
            }
            else {
                fnFail({status: ajax.status, text: ajax.responseText});
            }
        }
        else {
            fnLoading();
        }
    }
    ajax.send(data);
}