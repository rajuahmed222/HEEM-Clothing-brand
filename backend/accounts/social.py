"""Checks a Google or Facebook access token with the provider itself, on the server.
The browser only hands us a token; we never trust a name or email sent by the browser."""
import json
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings

PROVIDERS = ('google', 'facebook')
GRAPH = 'https://graph.facebook.com/v21.0'


class SocialError(Exception):
    """The token is not acceptable. The message is safe to show to the customer."""


class NotConfigured(SocialError):
    pass


def _get(url, headers=None):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers or {}), timeout=10) as r:
            return json.loads(r.read() or b'{}')
    except urllib.error.HTTPError:
        raise SocialError('The sign-in was rejected. Please try again.') from None
    except (urllib.error.URLError, TimeoutError, OSError, ValueError):
        raise SocialError('Could not reach the sign-in provider. Please try again.') from None


def config():
    return {'google': settings.GOOGLE_CLIENT_ID, 'facebook': settings.FACEBOOK_APP_ID if settings.FACEBOOK_APP_SECRET else ''}


def verify_google(access_token):
    cid = settings.GOOGLE_CLIENT_ID
    if not cid:
        raise NotConfigured('Google sign-in is not configured yet.')
    info = _get('https://oauth2.googleapis.com/tokeninfo?' + urllib.parse.urlencode({'access_token': access_token}))
    if info.get('aud') != cid:  # a token issued to some other app must not log anyone in here
        raise SocialError('The sign-in was rejected. Please try again.')
    u = _get('https://openidconnect.googleapis.com/v1/userinfo', {'Authorization': f'Bearer {access_token}'})
    if not u.get('sub'):
        raise SocialError('The sign-in was rejected. Please try again.')
    return {'uid': str(u['sub']), 'email': (u.get('email') or '').strip().lower(),
            'name': (u.get('name') or '').strip(), 'verified': u.get('email_verified') in (True, 'true')}


def verify_facebook(access_token):
    app_id, secret = settings.FACEBOOK_APP_ID, settings.FACEBOOK_APP_SECRET
    if not (app_id and secret):
        raise NotConfigured('Facebook sign-in is not configured yet.')
    dbg = (_get(f'{GRAPH}/debug_token?' + urllib.parse.urlencode(
        {'input_token': access_token, 'access_token': f'{app_id}|{secret}'})).get('data')) or {}
    if not dbg.get('is_valid') or str(dbg.get('app_id')) != app_id:
        raise SocialError('The sign-in was rejected. Please try again.')
    me = _get(f'{GRAPH}/me?' + urllib.parse.urlencode({'fields': 'id,name,email', 'access_token': access_token}))
    if not me.get('id') or str(me['id']) != str(dbg.get('user_id')):
        raise SocialError('The sign-in was rejected. Please try again.')
    email = (me.get('email') or '').strip().lower()
    return {'uid': str(me['id']), 'email': email, 'name': (me.get('name') or '').strip(), 'verified': bool(email)}


def verify(provider, access_token):
    return {'google': verify_google, 'facebook': verify_facebook}[provider](access_token)